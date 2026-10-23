// Administrative Settings & AI Configuration Synchronization Engine
// GitHub: cygnusorbit/zecratary
// Satisfies Constraint 8: Direct persistence to PostgreSQL & MySQL

export interface AdminSettings {
  id?: string;
  siteName: string;
  site_name?: string;
  titlebarEmoji: string;
  titlebar_emoji?: string;
  titlebarImage?: string;
  titlebar_image?: string;
  faviconEmoji: string;
  favicon_emoji?: string;
  faviconImage?: string;
  favicon_image?: string;
  currency: string;
  aiProvider: string;
  ai_provider?: string;
  aiModel: string;
  ai_model?: string;
  themeColors?: Record<string, any> | any;
  theme_colors?: Record<string, any> | any;
  paymentSettings?: Record<string, any>;
  payment_settings?: Record<string, any>;
  socialLogin?: Record<string, any>;
  social_login?: Record<string, any>;
  chefAiSettings?: Record<string, any>;
  chef_ai_settings?: Record<string, any>;
  recipeTypes?: string[];
  recipe_types?: string[];
  ingredientCategories?: string[];
  ingredient_categories?: string[];
  supportedLanguages?: string[];
  supported_languages?: string[];
  [key: string]: any;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  siteName: 'Zecratary',
  titlebarEmoji: '🍳',
  faviconEmoji: '🍳',
  currency: 'USD',
  aiProvider: 'gemini',
  aiModel: 'gemini-3.5-flash-lite',
  themeColors: {
    primary: '#10b981',
    card: '#ffffff',
    border: '#e5e7eb',
    background: '#f9fafb',
    text: '#111827',
  },
  paymentSettings: {
    stripeEnabled: true,
    currency: 'USD',
  },
  socialLogin: {
    googleEnabled: true,
  },
  chefAiSettings: {
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are Chef Zecratary, an expert culinary assistant.',
  },
  recipeTypes: ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Beverage'],
  ingredientCategories: ['Produce', 'Meat', 'Dairy', 'Pantry', 'Spices', 'Bakery'],
  supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'th'],
};

let memoryAdminSettings: AdminSettings = { ...DEFAULT_ADMIN_SETTINGS };

export function purgeLegacyBrowserAdminStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('zecratary_legacy_admin');
  } catch (_) {}
}

export async function fetchAdminSettings(): Promise<AdminSettings> {
  try {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      memoryAdminSettings = { ...DEFAULT_ADMIN_SETTINGS, ...(data.settings || data) };
      return memoryAdminSettings;
    }
  } catch (_) {}
  return memoryAdminSettings;
}

export async function syncAdminSettings(settings: Partial<AdminSettings>): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      memoryAdminSettings = { ...memoryAdminSettings, ...settings };
      return true;
    }
  } catch (_) {}
  return false;
}

export const fetchServerAdminSettings = fetchAdminSettings;
export const persistServerAdminSettings = syncAdminSettings;
export const persistAdminSettings = syncAdminSettings;

export function getStoredAdminSettings(): AdminSettings {
  return memoryAdminSettings;
}

export function saveStoredAdminSettings(settings: AdminSettings): void {
  memoryAdminSettings = { ...settings };
}

export default {
  purgeLegacyBrowserAdminStorage,
  fetchAdminSettings,
  fetchServerAdminSettings,
  syncAdminSettings,
  persistAdminSettings,
  persistServerAdminSettings,
  getStoredAdminSettings,
  saveStoredAdminSettings,
  DEFAULT_ADMIN_SETTINGS,
};
