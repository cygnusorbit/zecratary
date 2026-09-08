'use client';
import { useState, useEffect } from 'react';

export const DEFAULT_RECIPE_TYPES = [
  "Main Dish",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Appetizer",
  "Side Dish",
  "Salad",
  "Dessert",
  "Snacks",
  "Beverages"
];

const STORAGE_KEY = 'zecratary_recipe_types';
const EVENT_KEY = 'zecratary_recipe_types_changed';

export const getStoredRecipeTypes = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_RECIPE_TYPES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to read recipe types from storage:', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RECIPE_TYPES));
  return DEFAULT_RECIPE_TYPES;
};

export const saveRecipeTypes = (types: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
  window.dispatchEvent(new Event(EVENT_KEY));
};

export function useRecipeTypes() {
  const [recipeTypes, setRecipeTypes] = useState<string[]>(DEFAULT_RECIPE_TYPES);

  useEffect(() => {
    setRecipeTypes(getStoredRecipeTypes());

    const handleSync = () => {
      setRecipeTypes(getStoredRecipeTypes());
    };

    window.addEventListener(EVENT_KEY, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(EVENT_KEY, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  return recipeTypes;
}
