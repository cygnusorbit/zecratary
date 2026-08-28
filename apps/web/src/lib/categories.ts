'use client';

export const DEFAULT_CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat and Seafood",
  "Bakery",
  "Baking Supplies",
  "Pantry Staples",
  "Frozen Foods",
  "Snacks and Sweets",
  "Beverages",
  "Deli",
  "Condiments and Sauces",
  "Grains and Pasta",
  "Spices and Seasonings",
  "Ready Meals",
  "International Foods",
  "Household Items",
  "Personal Care",
  "Pet Supplies",
  "Baby Products",
  "Miscellaneous"
];

export const getStoredCategories = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem('zecratary_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  localStorage.setItem('zecratary_categories', JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
};

export const saveCategories = (categories: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('zecratary_categories', JSON.stringify(categories));
  window.dispatchEvent(new Event('zecratary_categories_changed'));
};
