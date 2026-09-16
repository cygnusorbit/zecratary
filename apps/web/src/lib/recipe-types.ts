// Server-backed Recipe Types Store
// Zero localStorage writes for recipe type management

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
  }
  return await persistServerAdminSettings({ recipeTypes: types });
}
