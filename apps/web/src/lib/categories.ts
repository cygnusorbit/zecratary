// Ingredient Categories Synchronization Engine
// GitHub: cygnusorbit/zecratary

export interface IngredientCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export const DEFAULT_CATEGORIES: string[] = [
  'Produce',
  'Meat & Poultry',
  'Seafood',
  'Dairy & Eggs',
  'Pantry & Dry Goods',
  'Bakery & Bread',
  'Spices & Seasonings',
  'Oils & Vinegars',
  'Beverages',
  'Frozen Foods',
];

export const INGREDIENT_CATEGORIES = DEFAULT_CATEGORIES;

let memoryCategories: string[] = [...DEFAULT_CATEGORIES];

export function setMemoryCategories(cats: string[] | undefined | null): void {
  if (Array.isArray(cats) && cats.length > 0) {
    memoryCategories = [...cats];
  }
}

export function getMemoryCategories(): string[] {
  return memoryCategories;
}

export async function fetchCategories(): Promise<string[]> {
  try {
    const res = await fetch('/api/admin/ingredient-categories', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data.categories) ? data.categories : (Array.isArray(data) ? data : DEFAULT_CATEGORIES);
      memoryCategories = list;
      return list;
    }
  } catch (_) {}
  return memoryCategories;
}

export async function persistCategories(categories: string[]): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/ingredient-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories }),
    });
    if (res.ok) {
      memoryCategories = [...categories];
      return true;
    }
  } catch (_) {}
  return false;
}

export const saveCategories = persistCategories;

export function getStoredCategories(): string[] {
  return memoryCategories;
}

export function saveStoredCategories(categories: string[]): void {
  memoryCategories = [...categories];
}

/**
 * Universal Hook / Function for consuming ingredient categories
 * Can be called as a hook or standard helper
 */
export function useIngredientCategories(): any {
  if (typeof window !== 'undefined') {
    try {
      const React = require('react');
      if (React.useState && React.useEffect) {
        const [categories, setCategories] = React.useState(memoryCategories);
        React.useEffect(() => {
          fetchCategories().then((c: any) => {
            if (Array.isArray(c) && c.length) setCategories(c);
          });
        }, []);
        const res: any = categories;
        res.categories = categories;
        res.setCategories = setCategories;
        res.loading = false;
        return res;
      }
    } catch (_) {}
  }
  const fallback: any = [...memoryCategories];
  fallback.categories = memoryCategories;
  fallback.loading = false;
  return fallback;
}

export default {
  setMemoryCategories,
  getMemoryCategories,
  saveCategories,
  fetchCategories,
  persistCategories,
  useIngredientCategories,
  getStoredCategories,
  saveStoredCategories,
  DEFAULT_CATEGORIES,
  INGREDIENT_CATEGORIES,
};
