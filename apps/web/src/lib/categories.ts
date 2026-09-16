// Server-backed Ingredient Categories Store
// Zero localStorage writes for category management

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
  }
  return await persistServerAdminSettings({ ingredientCategories: cats });
}
