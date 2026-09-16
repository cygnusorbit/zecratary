// Server-backed Recipe Types Store
// Synchronizes dynamically with PostgreSQL with zero localStorage writes

import { fetchServerAdminSettings, persistServerAdminSettings } from '@/lib/adminSync';

export const DEFAULT_RECIPE_TYPES: string[] = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Dessert',
  'Beverage',
  'Appetizer',
  'Salad',
  'Soup',
  'Side Dish',
  'Baking'
];

let memoryRecipeTypes: string[] = [...DEFAULT_RECIPE_TYPES];

export function getStoredRecipeTypes(): string[] {
  return [...memoryRecipeTypes];
}

export function setMemoryRecipeTypes(types: string[]): void {
  if (Array.isArray(types) && types.length > 0) {
    memoryRecipeTypes = [...types];
  }
}

export async function saveRecipeTypes(types: string[]): Promise<boolean> {
  memoryRecipeTypes = [...types];

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zecratary_recipe_types_changed', { detail: types }));
    window.dispatchEvent(new CustomEvent('zecratary_recipe_types_updated', { detail: types }));
  }

  let success = false;

  // 1. Direct PostgreSQL API Save
  try {
    const res = await fetch('/api/admin/recipe-type', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeTypes: types })
    });
    if (res.ok) success = true;
  } catch (_) {}

  // 2. Settings Synchronizer Save
  try {
    const res2 = await persistServerAdminSettings({ recipeTypes: types });
    if (res2) success = true;
  } catch (_) {}

  return success;
}

export function useRecipeTypes(): string[] {
  return getStoredRecipeTypes();
}
