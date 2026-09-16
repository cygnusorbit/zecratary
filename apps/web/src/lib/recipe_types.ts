// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect } from 'react';

export const DEFAULT_RECIPE_TYPES: string[] = [
  'Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 
  'Drink', 'Appetizer', 'Soup', 'Salad', 'Side Dish', 'Baking'
];

export function useRecipeTypes(): string[] {
  const [types, setTypes] = useState<string[]>(DEFAULT_RECIPE_TYPES);

  useEffect(() => {
    let isMounted = true;
    async function fetchTypes() {
      try {
        const res = await fetch('/api/admin/recipe-type', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.recipeTypes || data?.types);
          if (Array.isArray(list) && list.length > 0 && isMounted) {
            const parsed = list.map((item: any) => typeof item === 'string' ? item.trim() : (item.name || item.label || item.id || '').trim()).filter(Boolean);
            if (parsed.length > 0) { setTypes(parsed); return; }
          }
        }
      } catch (_) {}

      try {
        const res2 = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (res2.ok) {
          const data2 = await res2.json();
          const list2 = data2?.settings?.recipeTypes || data2?.recipeTypes;
          if (Array.isArray(list2) && list2.length > 0 && isMounted) {
            const parsed2 = list2.map((item: any) => typeof item === 'string' ? item.trim() : (item.name || item.label || item.id || '').trim()).filter(Boolean);
            if (parsed2.length > 0) setTypes(parsed2);
          }
        }
      } catch (_) {}
    }
    fetchTypes();
    const handleSync = () => fetchTypes();
    window.addEventListener('zecratary_recipe_types_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener('zecratary_recipe_types_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
    };
  }, []);

  return types;
}
