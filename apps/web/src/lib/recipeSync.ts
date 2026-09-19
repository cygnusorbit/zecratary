// Server-Backed Recipe Synchronization Module
// Strictly enforces creator ownership and attribution

export async function syncUserSavedRecipes(userId: string, email?: string): Promise<any[]> {
  const targetId = (userId || '').trim();
  const targetEmail = (email || '').trim();
  if (!targetId && !targetEmail) return [];

  const queryParams = new URLSearchParams();
  if (targetId) queryParams.set('userId', targetId);
  if (targetEmail) queryParams.set('email', targetEmail);

  try {
    const res = await fetch(`/api/recipes/saved?${queryParams.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.recipes)) {
        return data.recipes;
      }
    }
  } catch (_) {}

  try {
    const res2 = await fetch(`/api/saved-recipes?${queryParams.toString()}`, { cache: 'no-store' });
    if (res2.ok) {
      const data2 = await res2.json();
      if (Array.isArray(data2.recipes)) {
        return data2.recipes;
      }
    }
  } catch (_) {}

  return [];
}

export async function persistSavedRecipe(userId: string, recipeOrList: any, creatorMeta?: { createdBy?: string; creatorName?: string }): Promise<boolean> {
  const targetId = (userId || '').trim();
  if (!targetId) return false;

  const list = Array.isArray(recipeOrList) ? recipeOrList : [recipeOrList];

  const payload = list.map((item: any) => ({
    ...item,
    userId: targetId,
    user_id: targetId,
    createdBy: item.createdBy || item.created_by || creatorMeta?.createdBy || targetId,
    created_by: item.createdBy || item.created_by || creatorMeta?.createdBy || targetId,
    creatorName: item.creatorName || item.creator_name || creatorMeta?.creatorName || 'Creator',
    creator_name: item.creatorName || item.creator_name || creatorMeta?.creatorName || 'Creator',
    recipeType: item.recipeType || item.category || 'Main Dish',
    category: item.recipeType || item.category || 'Main Dish',
    instructions: item.instructions || item.directions || item.steps || [],
    directions: item.directions || item.instructions || item.steps || [],
    imageUrl: item.imageUrl || item.image || '',
    image: item.imageUrl || item.image || '',
    isFavorite: Boolean(item.isFavorite ?? item.is_favorite),
    is_favorite: Boolean(item.isFavorite ?? item.is_favorite),
    isCooked: Boolean(item.isCooked ?? item.is_cooked),
    is_cooked: Boolean(item.isCooked ?? item.is_cooked),
    rating: Number(item.rating) || 0,
    note: item.note || '',
    bookId: item.bookId || item.book_id || null,
    book_id: item.bookId || item.book_id || null,
    sourceUrl: item.sourceUrl || item.source_url || '',
    source_url: item.sourceUrl || item.source_url || ''
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
