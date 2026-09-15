import os
import glob
import json
import re

print("🔍 Scanning project for saved recipes persistence and sync...")

# 1. Locate App Router and lib directories
candidates = ['apps/web/src/app', 'src/app', 'apps/web/app', 'app']
app_dir = next((c for c in candidates if os.path.exists(c)), None)

if not app_dir:
    matches = glob.glob('**/lib/auth.ts', recursive=True)
    if matches:
        app_dir = os.path.join(os.path.dirname(os.path.dirname(matches[0])), 'app')

if not app_dir:
    print("❌ Error: Could not locate Next.js app directory.")
    exit(1)

base_dir = os.path.dirname(app_dir)
web_root = os.path.dirname(base_dir) if os.path.basename(base_dir) == 'src' else base_dir
lib_dir = os.path.join(base_dir, 'lib')
data_dir = os.path.join(web_root, 'data')
os.makedirs(data_dir, exist_ok=True)
os.makedirs(lib_dir, exist_ok=True)

# 2. Ensure data/saved_recipes.json exists on disk
saved_recipes_file = os.path.join(data_dir, 'saved_recipes.json')
if not os.path.exists(saved_recipes_file):
    with open(saved_recipes_file, 'w', encoding='utf-8') as f:
        json.dump({}, f, indent=2)
    print(f"✓ Created server storage: {saved_recipes_file}")

# 3. Create /api/recipes/saved/route.ts
api_saved_dir = os.path.join(app_dir, 'api', 'recipes', 'saved')
os.makedirs(api_saved_dir, exist_ok=True)
api_saved_path = os.path.join(api_saved_dir, 'route.ts')

api_saved_code = """import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSavedRecipesFile() {
  const root = process.cwd();
  const candidates = [
    path.join(root, 'apps', 'web', 'data', 'saved_recipes.json'),
    path.join(root, 'data', 'saved_recipes.json')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const fallback = path.join(root, 'data', 'saved_recipes.json');
  fs.mkdirSync(path.dirname(fallback), { recursive: true });
  if (!fs.existsSync(fallback)) {
    fs.writeFileSync(fallback, JSON.stringify({}), 'utf8');
  }
  return fallback;
}

function readSavedStore(): Record<string, any[]> {
  try {
    const filePath = getSavedRecipesFile();
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || '{}');
  } catch (_) {
    return {};
  }
}

function writeSavedStore(data: Record<string, any[]>) {
  try {
    const filePath = getSavedRecipesFile();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to saved_recipes.json', err);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const store = readSavedStore();
    const userRecipes = store[userId] || [];

    return new NextResponse(JSON.stringify({ success: true, recipes: userRecipes }), {
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
    const { userId, recipe, recipes, recipeId, action } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const store = readSavedStore();
    let currentList = store[userId] || [];

    if (action === 'sync' && Array.isArray(recipes)) {
      // Merge unique recipes by ID or title
      const map = new Map();
      currentList.forEach(r => { if (r && (r.id || r.title || r.name)) map.set(r.id || r.title || r.name, r); });
      recipes.forEach(r => { if (r && (r.id || r.title || r.name)) map.set(r.id || r.title || r.name, r); });
      currentList = Array.from(map.values());
    } else if (action === 'remove') {
      const targetId = recipeId || (recipe && (recipe.id || recipe.title || recipe.name));
      currentList = currentList.filter(r => r.id !== targetId && r.title !== targetId && r.name !== targetId);
    } else {
      // Save or Add recipe
      if (recipe) {
        const recipeKey = recipe.id || recipe.title || recipe.name;
        const exists = currentList.some(r => (r.id && r.id === recipe.id) || (r.title && r.title === recipe.title));
        if (!exists) {
          currentList.unshift({ ...recipe, savedAt: recipe.savedAt || new Date().toISOString() });
        }
      }
    }

    store[userId] = currentList;
    writeSavedStore(store);

    return NextResponse.json({ success: true, recipes: currentList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
"""
with open(api_saved_path, 'w', encoding='utf-8') as f:
    f.write(api_saved_code)
print(f"✓ Provisioned API endpoint: {api_saved_path}")

# 4. Create lib/recipeSync.ts helper module
sync_lib_path = os.path.join(lib_dir, 'recipeSync.ts')
sync_lib_code = """// Cross-Browser Recipe Synchronization Engine
export async function syncUserSavedRecipes(userId: string): Promise<any[]> {
  if (!userId || typeof window === 'undefined') return [];
  try {
    // 1. Read existing local storage
    const rawLocal = localStorage.getItem('zecratary_saved_recipes') || localStorage.getItem('zecratary_recipes');
    let localList: any[] = [];
    if (rawLocal) {
      try { localList = JSON.parse(rawLocal); } catch (_) {}
    }

    // 2. Fetch server records
    const res = await fetch(`/api/recipes/saved?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store'
    });

    if (!res.ok) return localList;
    const data = await res.json();
    const serverList: any[] = data.recipes || [];

    // 3. Bidirectional Sync
    if (localList.length > 0 && serverList.length === 0) {
      // Push local recipes to server disk
      await fetch('/api/recipes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, recipes: localList, action: 'sync' })
      });
      return localList;
    }

    // Merge server with local (server holds priority)
    const map = new Map();
    localList.forEach(r => { if (r && (r.id || r.title || r.name)) map.set(r.id || r.title || r.name, r); });
    serverList.forEach(r => { if (r && (r.id || r.title || r.name)) map.set(r.id || r.title || r.name, r); });
    const merged = Array.from(map.values());

    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.error('Failed to sync recipes with server:', err);
    try {
      const fallback = localStorage.getItem('zecratary_saved_recipes');
      return fallback ? JSON.parse(fallback) : [];
    } catch (_) {
      return [];
    }
  }
}

export async function persistSavedRecipe(userId: string, recipe: any, action: 'save' | 'remove' = 'save') {
  if (typeof window === 'undefined') return;

  try {
    const rawLocal = localStorage.getItem('zecratary_saved_recipes') || '[]';
    let localList: any[] = JSON.parse(rawLocal);

    if (action === 'save') {
      const exists = localList.some(r => (r.id && r.id === recipe.id) || (r.title && r.title === recipe.title));
      if (!exists) localList.unshift(recipe);
    } else {
      const targetId = recipe.id || recipe.title || recipe.name;
      localList = localList.filter(r => r.id !== targetId && r.title !== targetId && r.name !== targetId);
    }

    localStorage.setItem('zecratary_saved_recipes', JSON.stringify(localList));
    window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));

    if (userId) {
      await fetch('/api/recipes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, recipe, recipeId: recipe.id || recipe.title, action })
      });
    }
  } catch (e) {
    console.error('persistSavedRecipe error:', e);
  }
}
"""
with open(sync_lib_path, 'w', encoding='utf-8') as f:
    f.write(sync_lib_code)
print(f"✓ Created synchronization helper: {sync_lib_path}")

# 5. Patch apps/web/src/app/saved/page.tsx
saved_page_files = glob.glob(f'{app_dir}/**/saved/page.tsx', recursive=True)
for sp in saved_page_files:
    with open(sp, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'syncUserSavedRecipes' not in content:
        # Inject helper import
        content = re.sub(
            r"(import\s*\{[^}]+AuthStorage[^}]*\}\s*from\s*['\"]@/lib/auth['\"];?)",
            r"\1\nimport { syncUserSavedRecipes, persistSavedRecipe } from '@/lib/recipeSync';",
            content,
            count=1
        )
        if 'syncUserSavedRecipes' not in content:
            content = "import { syncUserSavedRecipes, persistSavedRecipe } from '@/lib/recipeSync';\n" + content

        # Inject server synchronization inside useEffect
        sync_call = """
    // Cross-browser server disk synchronization
    if (active && (active.id || active.email)) {
      const uId = active.id || active.email;
      syncUserSavedRecipes(uId).then((syncedList) => {
        if (Array.isArray(syncedList) && syncedList.length > 0) {
          setRecipes(syncedList);
        }
      }).catch(() => {});
    }
"""
        # Find where setRecipes or localStorage is read in useEffect
        if 'localStorage.getItem(' in content:
            content = re.sub(
                r"(\s*setRecipes\([^)]+\);?)",
                r"\1" + sync_call,
                content,
                count=1
            )

        # Hook removal handler to also remove from server
        content = re.sub(
            r"(const\s+handleRemove\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?localStorage\.setItem\([^;]+;)",
            r"""\1
    if (user && (user.id || user.email)) {
      persistSavedRecipe(user.id || user.email, { id }, 'remove');
    }""",
            content,
            count=1
        )

        with open(sp, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Patched server sync into: {sp}")

# 6. Patch apps/web/src/app/recipe/page.tsx for bookmark/save persistence
recipe_page_files = glob.glob(f'{app_dir}/**/recipe/page.tsx', recursive=True)
for rp in recipe_page_files:
    with open(rp, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'persistSavedRecipe' not in content:
        content = re.sub(
            r"(import\s*\{[^}]+\}\s*from\s*['\"]@/lib/auth['\"];?)",
            r"\1\nimport { persistSavedRecipe } from '@/lib/recipeSync';",
            content,
            count=1
        )
        if 'persistSavedRecipe' not in content:
            content = "import { persistSavedRecipe } from '@/lib/recipeSync';\n" + content

        # Wire handleSave or handleBookmark to persist to server
        pattern = re.compile(r"(localStorage\.setItem\(['\"]zecratary_saved_recipes['\"][^;]+;)", re.MULTILINE)
        if pattern.search(content):
            content = pattern.sub(
                r"""\1
      const activeUser = getCurrentUser();
      if (activeUser && (activeUser.id || activeUser.email)) {
        persistSavedRecipe(activeUser.id || activeUser.email, recipe, 'save');
      }""",
                content,
                count=1
            )

        with open(rp, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Patched bookmark sync into: {rp}")

print("\n🚀 Cross-browser saved recipes synchronization successfully deployed!")
