import { useState, useEffect } from 'react';

const DEFAULT_TYPES = [
  'Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Appetiser', 
  'Side Dish', 'Dessert', 'Snacks', 'Beverages', 'Soup', 'Salad'
];

const DEFAULT_CATEGORIES = [
  'Produce', 'Meat & Seafood', 'Pantry & Dry Goods', 'Dairy & Eggs',
  'Bakery', 'Frozen', 'Spices & Seasonings', 'Canned Goods', 'Condiments & Sauces', 'Other'
];

export function useRecipeTypes(): string[] {
  const [types, setTypes] = useState<string[]>(DEFAULT_TYPES);

  useEffect(() => {
    async function fetchTypes() {
      try {
        const res = await fetch('/api/admin/recipe-type', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.types || data.recipeTypes || []);
          if (list.length > 0) {
            setTypes(list.map((x: any) => typeof x === 'string' ? x : (x.name || x.label || x.id)).filter(Boolean));
            return;
          }
        }
      } catch (_) {}

      try {
        const local = localStorage.getItem('zecratary_recipe_types') || localStorage.getItem('zecratary_recipe_categories');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTypes(parsed.map((x: any) => typeof x === 'string' ? x : (x.name || x.label || x.id)).filter(Boolean));
          }
        }
      } catch (_) {}
    }

    fetchTypes();
  }, []);

  return types;
}

export function useIngredientCategories(): string[] {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/admin/ingredient-categories', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.categories || data.ingredientCategories || []);
          if (list.length > 0) {
            setCategories(list.map((x: any) => typeof x === 'string' ? x : (x.name || x.label || x.id)).filter(Boolean));
            return;
          }
        }
      } catch (_) {}

      try {
        const local = localStorage.getItem('zecratary_categories') || localStorage.getItem('zecratary_ingredient_categories');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed.map((x: any) => typeof x === 'string' ? x : (x.name || x.label || x.id)).filter(Boolean));
          }
        }
      } catch (_) {}
    }

    fetchCategories();
  }, []);

  return categories;
}
