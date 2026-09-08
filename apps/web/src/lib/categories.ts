'use client';
import { useState, useEffect } from 'react';

export const DEFAULT_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat and Seafood',
  'Bakery',
  'Baking Supplies',
  'Pantry Staples',
  'Frozen Foods',
  'Snacks and Sweets',
  'Beverages',
  'Deli',
  'Condiments and Sauces',
  'Grains and Pasta',
  'Spices and Seasonings',
  'Ready Meals',
  'International Foods',
  'Household Items',
  'Personal Care',
  'Pet Supplies',
  'Baby Products',
  'Miscellaneous'
];

const STORAGE_KEY = 'zecratary_ingredient_categories';
const EVENT_KEY = 'zecratary_categories_changed';

export const getStoredCategories = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('zecratary_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: any) => (typeof c === 'string' ? c : c.name || String(c)));
      }
    }
  } catch (e) {
    console.error('Failed to read categories from storage:', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
};

export const saveCategories = (categories: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  localStorage.setItem('zecratary_categories', JSON.stringify(categories));
  window.dispatchEvent(new Event(EVENT_KEY));
};

export function useIngredientCategories(): string[] {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    setCategories(getStoredCategories());

    const handleSync = () => {
      setCategories(getStoredCategories());
    };

    window.addEventListener(EVENT_KEY, handleSync);
    window.addEventListener('zecratary_categories_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener(EVENT_KEY, handleSync);
      window.removeEventListener('zecratary_categories_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  return categories;
}
