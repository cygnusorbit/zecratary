// Bi-directional recipe synchronization supporting import, manual, and server sources

export function getLocalRecipes(): any[] {
  if (typeof window === 'undefined') return [];
  const keys = ['zecratary_saved_recipes', 'zecratary_recipes', 'saved_recipes', 'savedRecipes', 'recipes'];
  const map = new Map<string, any>();

  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const r of parsed) {
            if (r && typeof r === 'object') {
              const id = String(r.id || r.title || r.name || '').trim().toLowerCase();
              if (id && !map.has(id)) {
                map.set(id, r);
              }
            }
          }
        }
      }
    } catch (_) {}
  }
  return Array.from(map.values());
}

export async function syncUserSavedRecipes(userIdOrEmail: string): Promise<any[]> {
  const uKey = (userIdOrEmail || 'usr_admin_1').trim();
  const localList = getLocalRecipes();

  try {
    const res = await fetch(`/api/saved-recipes?userId=${encodeURIComponent(uKey)}`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache, no-store' },
      cache: 'no-store'
    });

    if (res.ok) {
      const serverRecipes = await res.json();
      const sList = Array.isArray(serverRecipes) ? serverRecipes : (serverRecipes.recipes || []);

      // Merge server and local (which includes newly imported recipes)
      const mergedMap = new Map<string, any>();
      for (const r of sList) {
        const key = String(r.id || r.title || r.name || '').trim().toLowerCase();
        if (key) mergedMap.set(key, r);
      }

      let newLocalFound = false;
      for (const r of localList) {
        const key = String(r.id || r.title || r.name || '').trim().toLowerCase();
        if (key && !mergedMap.has(key)) {
          mergedMap.set(key, { ...r, userId: uKey });
          newLocalFound = true;
        }
      }

      const combined = Array.from(mergedMap.values());

      // If local import had recipes missing from server, push them up immediately
      if (newLocalFound && combined.length > sList.length) {
        persistSavedRecipe(uKey, combined).catch(() => {});
      }

      // Keep localStorage in sync so /import and /manual components can read state
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('zecratary_recipes', JSON.stringify(combined));
          localStorage.setItem('zecratary_saved_recipes', JSON.stringify(combined));
        } catch (_) {}
      }

      return combined;
    }
  } catch (err) {
    console.warn('[recipeSync] Server fetch error, using local data:', err);
  }

  return localList;
}

export async function persistSavedRecipe(userIdOrEmail: string, recipes: any[]): Promise<boolean> {
  const uKey = (userIdOrEmail || 'usr_admin_1').trim();

  // Sync to local browser storage immediately so other pages see it
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('zecratary_saved_recipes', JSON.stringify(recipes));
      localStorage.setItem('zecratary_recipes', JSON.stringify(recipes));
    } catch (_) {}
  }

  try {
    const res = await fetch('/api/saved-recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uKey, recipes })
    });
    return res.ok;
  } catch (err) {
    console.error('[recipeSync] Server persist failed:', err);
    return false;
  }
}
