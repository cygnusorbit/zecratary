import { getCurrentUser } from '@/lib/auth';

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
