// Server-backed Ingredient Categories Store
// Zero localStorage writes, full PostgreSQL synchronization

'use client';
import { useState, useEffect } from 'react';
import { fetchServerAdminSettings, persistServerAdminSettings } from '@/lib/adminSync';

export const DEFAULT_CATEGORIES: string[] = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Poultry',
  'Seafood',
  'Bakery',
  'Pantry & Dry Goods',
  'Canned Goods',
  'Baking & Cooking',
  'Spices & Seasonings',
  'Snacks',
  'Beverages',
  'Frozen Foods',
  'Condiments & Sauces',
  'Oils & Vinegars'
];

export const DEFAULT_INGREDIENT_CATEGORIES = DEFAULT_CATEGORIES;

let memoryCategories: string[] = [...DEFAULT_CATEGORIES];

export function getStoredCategories(): string[] {
  return [...memoryCategories];
}

export function setMemoryCategories(cats: string[]): void {
  if (Array.isArray(cats) && cats.length > 0) {
    memoryCategories = [...cats];
  }
}

export async function saveCategories(cats: string[]): Promise<boolean> {
  memoryCategories = [...cats];

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zecratary_categories_changed', { detail: cats }));
    window.dispatchEvent(new CustomEvent('zecratary_ingredient_categories_updated', { detail: cats }));
  }

  let success = false;

  // 1. Dedicated PostgreSQL API Save
  try {
    const res = await fetch('/api/admin/ingredient-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientCategories: cats })
    });
    if (res.ok) success = true;
  } catch (_) {}

  // 2. Settings Synchronizer Save
  try {
    const res2 = await persistServerAdminSettings({ ingredientCategories: cats });
    if (res2) success = true;
  } catch (_) {}

  return success;
}

export function useIngredientCategories(): string[] {
  const [categories, setCategories] = useState<string[]>(memoryCategories);

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
            if (parsed.length > 0) {
              setCategories(parsed);
              setMemoryCategories(parsed);
              return;
            }
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
            if (parsed2.length > 0) {
              setCategories(parsed2);
              setMemoryCategories(parsed2);
            }
          }
        }
      } catch (_) {}
    }

    fetchCategories();

    const handleSync = (e: any) => {
      if (e?.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setCategories(e.detail);
        setMemoryCategories(e.detail);
      } else {
        fetchCategories();
      }
    };

    window.addEventListener('zecratary_ingredient_categories_updated', handleSync);
    window.addEventListener('zecratary_categories_changed', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('zecratary_ingredient_categories_updated', handleSync);
      window.removeEventListener('zecratary_categories_changed', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
    };
  }, []);

  return categories;
}
