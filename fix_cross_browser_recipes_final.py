import os
import glob
import json
import re

print("🔍 Repairing saved recipe synchronization across browsers...")

# 1. Locate App Router, base, and web directories
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate App Router directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
web_root = os.path.dirname(base_dir) if os.path.basename(base_dir) == 'src' else base_dir
lib_dir = os.path.join(base_dir, 'lib')
components_dir = os.path.join(base_dir, 'components')

# Dual data directories to prevent monorepo split-brain issues
data_dirs = [
    os.path.join(process_cwd := os.getcwd(), 'data'),
    os.path.join(process_cwd, 'apps', 'web', 'data'),
    os.path.join(web_root, 'data')
]
for d in data_dirs:
    os.makedirs(d, exist_ok=True)
    fpath = os.path.join(d, 'saved_recipes.json')
    if not os.path.exists(fpath):
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump({}, f, indent=2)

print(f"✓ App directory located: {app_dir}")

# 2. Provision /api/recipes/saved/route.ts with dual-path disk writing and normalized key lookups
api_saved_dir = os.path.join(app_dir, 'api', 'recipes', 'saved')
os.makedirs(api_saved_dir, exist_ok=True)
api_saved_path = os.path.join(api_saved_dir, 'route.ts')

api_saved_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getAllSavedFiles(): string[] {
  const root = process.cwd();
  const candidates = [
    path.join(root, 'data', 'saved_recipes.json'),
    path.join(root, 'apps', 'web', 'data', 'saved_recipes.json'),
    path.resolve(root, '..', 'data', 'saved_recipes.json'),
    path.resolve(root, '..', 'apps', 'web', 'data', 'saved_recipes.json')
  ];
  return Array.from(new Set(candidates));
}

function readSavedStore(): Record<string, any[]> {
  for (const f of getAllSavedFiles()) {
    if (fs.existsSync(f)) {
      try {
        const raw = fs.readFileSync(f, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            return parsed;
          }
        }
      } catch (_) {}
    }
  }
  return {};
}

function writeSavedStore(store: Record<string, any[]>) {
  const files = getAllSavedFiles();
  const serialized = JSON.stringify(store, null, 2);
  for (const f of files) {
    try {
      const dir = path.dirname(f);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(f, serialized, 'utf-8');
    } catch (err) {
      console.warn('Could not write to', f, err);
    }
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim();
    const email = (searchParams.get('email') || '').trim().toLowerCase();

    if (!userId && !email) {
      return NextResponse.json({ success: false, error: 'User identifier is required' }, { status: 400 });
    }

    const store = readSavedStore();
    const cleanId = userId.toLowerCase();
    
    // Look up by email, ID, or normalized keys
    let recipes = store[cleanId] || (email ? store[email] : null) || store[userId] || [];

    if (!recipes || recipes.length === 0) {
      // Search case-insensitively across store keys
      for (const [k, list] of Object.entries(store)) {
        const lowerK = k.toLowerCase();
        if (lowerK === cleanId || (email && lowerK === email)) {
          recipes = list;
          break;
        }
      }
    }

    return new NextResponse(JSON.stringify({ success: true, recipes: recipes || [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email, recipe, recipes, recipeId, action } = body;

    const key = (email || userId || '').trim().toLowerCase();
    if (!key) {
      return NextResponse.json({ success: false, error: 'User key is required' }, { status: 400 });
    }

    const store = readSavedStore();
    let current = store[key] || (userId ? store[userId.toLowerCase()] : []) || [];

    if (action === 'sync' && Array.isArray(recipes)) {
      const map = new Map<string, any>();
      current.forEach((r: any) => {
        if (r) {
          const rk = (r.id || r.title || r.name || JSON.stringify(r)).toString().trim().toLowerCase();
          map.set(rk, r);
        }
      });
      recipes.forEach((r: any) => {
        if (r) {
          const rk = (r.id || r.title || r.name || JSON.stringify(r)).toString().trim().toLowerCase();
          map.set(rk, r);
        }
      });
      current = Array.from(map.values());
    } else if (action === 'remove') {
      const target = (recipeId || (recipe && (recipe.id || recipe.title || recipe.name)) || '').toString().trim().toLowerCase();
      current = current.filter((r: any) => {
        const rk = (r.id || r.title || r.name || '').toString().trim().toLowerCase();
        return rk !== target;
      });
    } else {
      if (recipe) {
        const rk = (recipe.id || recipe.title || recipe.name || '').toString().trim().toLowerCase();
        const exists = current.some((r: any) => {
          const existingKey = (r.id || r.title || r.name || '').toString().trim().toLowerCase();
          return existingKey === rk;
        });
        if (!exists) {
          current.unshift({ ...recipe, savedAt: recipe.savedAt || new Date().toISOString() });
        }
      }
    }

    store[key] = current;
    if (userId && userId.toLowerCase() !== key) {
      store[userId.toLowerCase()] = current;
    }
    if (email && email.toLowerCase() !== key) {
      store[email.toLowerCase()] = current;
    }

    writeSavedStore(store);

    return NextResponse.json({ success: true, recipes: current });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(api_saved_path, 'w', encoding='utf-8') as f:
    f.write(api_saved_code)
print(f"✓ Created server endpoint: {api_saved_path}")

# 3. Provision lib/recipeSync.ts with safe self-contained authentication retrieval
sync_lib_path = os.path.join(lib_dir, 'recipeSync.ts')
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

    // If local has recipes and server is empty, upload local up to server
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

    // Merge server and local records (deduplicate by id or title)
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

    // If local had items that server lacked, sync back to server
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
with open(sync_lib_path, 'w', encoding='utf-8') as f:
    f.write(sync_lib_code)
print(f"✓ Created synchronization helper: {sync_lib_path}")

# 4. Patch ClientLayout.tsx with a global auto-sync bridge
client_layout_candidates = [
    os.path.join(app_dir, 'ClientLayout.tsx'),
    os.path.join(base_dir, 'app', 'ClientLayout.tsx'),
    os.path.join(base_dir, 'components', 'ClientLayout.tsx')
]
client_layout_path = next((p for p in client_layout_candidates if os.path.exists(p)), None)

if client_layout_path:
    with open(client_layout_path, 'r', encoding='utf-8') as f:
        cl_code = f.read()

    if 'syncUserSavedRecipes' not in cl_code:
        cl_code = "import { syncUserSavedRecipes } from '@/lib/recipeSync';\n" + cl_code
        global_bridge = """  // Global Cross-Browser Recipe Sync Bridge
  useEffect(() => {
    try {
      syncUserSavedRecipes();
    } catch (_) {}
  }, []);
"""
        # Inject inside the main component function
        pattern = re.compile(r'(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)')
        if pattern.search(cl_code):
          cl_code = pattern.sub(f"\\1\n{global_bridge}", cl_code, count=1)
          with open(client_layout_path, 'w', encoding='utf-8') as f:
              f.write(cl_code)
          print(f"✓ Injected global background sync in: {client_layout_path}")

# 5. Clean and repair apps/web/src/app/saved/page.tsx
saved_pages = glob.glob(f'{app_dir}/**/saved/page.tsx', recursive=True)
for sp in saved_pages:
    with open(sp, 'r', encoding='utf-8') as f:
        code = f.read()

    # Strip any broken previous injection containing 'active'
    code = re.sub(r'// Cross-browser server disk synchronization[\s\S]*?syncUserSavedRecipes\(uId\)[\s\S]*?\}\s*\}\)\.catch\(\(\)\s*=>\s*\{\}\);?\s*\}?', '', code)
    code = re.sub(r'if\s*\(\s*active\s*&&[^)]*\)\s*\{[\s\S]*?syncUserSavedRecipes[\s\S]*?\}', '', code)

    # Ensure imports
    if 'getCurrentUser' not in code:
        code = re.sub(r"(import\s*\{[^}]*\}\s*from\s*['\"]@/lib/auth['\"];?)", r"import { getCurrentUser } from '@/lib/auth';\n\1", code, count=1)
        if 'getCurrentUser' not in code:
            code = "import { getCurrentUser } from '@/lib/auth';\n" + code

    if 'syncUserSavedRecipes' not in code:
        code = "import { syncUserSavedRecipes, persistSavedRecipe, getLocalRecipes } from '@/lib/recipeSync';\n" + code

    # Inject safe mount synchronizer and live event listener
    safe_sync_snippet = """    // Safe Cross-Browser Recipe Synchronization
    const activeUser = getCurrentUser();
    if (activeUser && (activeUser.id || activeUser.email)) {
      const uKey = (activeUser.email || activeUser.id).toLowerCase().trim();
      syncUserSavedRecipes(uKey).then((synced) => {
        if (Array.isArray(synced) && synced.length > 0) {
          setRecipes(synced);
        }
      }).catch(() => {});
    }

    const onRecipesUpdated = () => {
      const current = getLocalRecipes();
      if (Array.isArray(current) && current.length > 0) {
        setRecipes(current);
      }
    };
    window.addEventListener('zecratary_saved_recipes_updated', onRecipesUpdated);
"""

    if 'onRecipesUpdated' not in code:
        # Place inside primary useEffect
        if 'useEffect(' in code:
            code = re.sub(
                r'(useEffect\s*\(\s*\(\)\s*=>\s*\{)',
                f"\\1\n{safe_sync_snippet}",
                code,
                count=1
            )
            # Add cleanup listener before return if missing
            if 'return () => window.removeEventListener' not in code:
                code = re.sub(
                    r'(return\s*\(\)\s*=>\s*\{)',
                    r"\1\n      window.removeEventListener('zecratary_saved_recipes_updated', onRecipesUpdated);",
                    code,
                    count=1
                )

    # Safe handleRemove wrapper
    if 'persistSavedRecipe' in code and 'persistSavedRecipe(id, \'remove\')' not in code:
        code = re.sub(
            r'(const\s+handleRemove\s*=\s*(?:async\s*)?\([^)]*id[^)]*\)\s*=>\s*\{)',
            r"\1\n    persistSavedRecipe(id, 'remove');",
            code,
            count=1
        )

    with open(sp, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"✓ Fixed and repaired: {sp}")

# 6. Patch recipe/page.tsx to wire persistSavedRecipe on bookmark/save
recipe_pages = glob.glob(f'{app_dir}/**/recipe/page.tsx', recursive=True)
for rp in recipe_pages:
    with open(rp, 'r', encoding='utf-8') as f:
        code = f.read()

    if 'persistSavedRecipe' not in code:
        code = "import { persistSavedRecipe } from '@/lib/recipeSync';\n" + code

    # Wire save to persist to server
    if 'persistSavedRecipe(' not in code:
        code = re.sub(
            r"(localStorage\.setItem\(['\"]zecratary_saved_recipes['\"][^;]+;)",
            r"\1\n      persistSavedRecipe(recipe, 'save');",
            code,
            count=1
        )
        with open(rp, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"✓ Synced bookmark persistence in: {rp}")

print("\n🚀 Cross-browser saved recipes sync repaired and deployed successfully!")
