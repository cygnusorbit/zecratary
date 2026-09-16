// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect } from 'react';

export const DEFAULT_INGREDIENT_CATEGORIES: string[] = [
  'Pantry Staples', 'Produce', 'Meat & Poultry', 'Seafood', 'Dairy & Eggs', 
  'Dry Goods', 'Bakery', 'Canned Goods', 'Spices & Seasonings', 'Oils & Condiments', 'Frozen', 'Beverages', 'Other'
];

export function getStoredCategories(): string[] {
  return DEFAULT_INGREDIENT_CATEGORIES;
}

export function useIngredientCategories(): string[] {
  const [categories, setCategories] = useState<string[]>(DEFAULT_INGREDIENT_CATEGORIES);

  useEffect(() => {
    let isMounted = true;
    async function fetchCategories() {
      try {
        const res = await fetch('/api/admin/ingredient-categories', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data?.ingredientCategories || data?.categories);
          if (Array.isArray(list) && list.length > 0 && isMounted) {
            const parsed = list.map((item: any) => typeof item === 'string' ? item.trim() : (item.name || item.label || item.id || '').trim()).filter(Boolean);
            if (parsed.length > 0) { setCategories(parsed); return; }
          }
        }
      } catch (_) {}

      try {
        const res2 = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (res2.ok) {
          const data2 = await res2.json();
          const list2 = data2?.settings?.ingredientCategories || data2?.ingredientCategories;
          if (Array.isArray(list2) && list2.length > 0 && isMounted) {
            const parsed2 = list2.map((item: any) => typeof item === 'string' ? item.trim() : (item.name || item.label || item.id || '').trim()).filter(Boolean);
            if (parsed2.length > 0) setCategories(parsed2);
          }
        }
      } catch (_) {}
    }
    fetchCategories();
    const handleSync = () => fetchCategories();
    window.addEventListener('zecratary_ingredient_categories_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener('zecratary_ingredient_categories_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
    };
  }, []);

  return categories;
}
