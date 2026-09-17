// Server-Backed Recipe Synchronization Module
// Direct PostgreSQL operations with local fallback sync

export async function syncUserSavedRecipes(userId: string): Promise<any[]> {
  const targetId = userId || 'usr_admin_1';
  let serverRecipes: any[] = [];

  try {
    const res = await fetch(`/api/recipes/saved?userId=${encodeURIComponent(targetId)}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.recipes)) {
        serverRecipes = data.recipes;
      }
    }
  } catch (_) {}

  // Self-healing bridge: if any recipes are present in localStorage, upload them to PostgreSQL
  if (typeof window !== 'undefined') {
    try {
      const keys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes'];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const unsynced = list.filter((lr: any) => 
              lr && (lr.title || lr.name) && 
              !serverRecipes.some((sr: any) => 
                (sr.id === lr.id) || 
                ((sr.title || sr.name)?.toLowerCase().trim() === (lr.title || lr.name)?.toLowerCase().trim())
              )
            );

            if (unsynced.length > 0) {
              fetch('/api/recipes/saved', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(unsynced.map(r => ({ ...r, userId: targetId })))
              }).catch(() => {});

              serverRecipes = [...unsynced, ...serverRecipes];
            }
          }
        }
      }
    } catch (_) {}
  }

  return serverRecipes;
}

export async function persistSavedRecipe(userId: string, recipeOrList: any): Promise<boolean> {
  const targetId = userId || 'usr_admin_1';
  const list = Array.isArray(recipeOrList) ? recipeOrList : [recipeOrList];

  const payload = list.map((item: any) => ({
    ...item,
    userId: item.userId || item.user_id || targetId,
    user_id: item.userId || item.user_id || targetId,
    recipeType: item.recipeType || item.category || 'Main Dish',
    category: item.recipeType || item.category || 'Main Dish',
    instructions: item.instructions || item.directions || item.steps || [],
    directions: item.directions || item.instructions || item.steps || [],
    imageUrl: item.imageUrl || item.image || '',
    image: item.imageUrl || item.image || ''
  }));

  try {
    const res = await fetch('/api/recipes/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
    }

    return res.ok;
  } catch (_) {
    return false;
  }
}

export async function deleteSavedRecipe(userId: string, recipeId: string): Promise<boolean> {
  if (!recipeId) return false;

  try {
    await Promise.allSettled([
      fetch(`/api/recipes/saved?id=${encodeURIComponent(recipeId)}`, { method: 'DELETE' }),
      fetch(`/api/saved-recipes?id=${encodeURIComponent(recipeId)}`, { method: 'DELETE' }),
      fetch(`/api/recipes?id=${encodeURIComponent(recipeId)}`, { method: 'DELETE' })
    ]);
  } catch (err) {
    console.error('[recipeSync] Server delete error:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const keys = ['zecratary_saved_recipes', 'zecratary_recipes', 'zecratary_user_recipes', 'saved_recipes', 'zecratary_imported_recipes'];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const cleaned = arr.filter((r: any) => r.id !== recipeId);
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        }
      }
    } catch (_) {}

    window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
    window.dispatchEvent(new Event('zecratary_recipes_updated'));
  }

  return true;
}

export function getLocalRecipes(userId: string): any[] {
  return [];
}
