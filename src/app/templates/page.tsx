'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, Plus, Trash2, Edit3, CalendarPlus, 
  Sparkles, Check, X, BookOpen, RefreshCw, 
  CheckCircle2, AlertCircle, ChevronRight,
  Clock, Flame, Users, ExternalLink, ChefHat,
  HardDrive, Type, Minus, Calendar, Info
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage, setCurrentUser } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';

interface StorageConfig {
  provider: 'localhost' | 'supabase';
  localhost: {
    uploadDir: string;
    publicPrefix: string;
    recipesJsonDir: string;
    maxSizeMb: number;
    allowedTypes?: string;
  };
  supabase: {
    enabled: boolean;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrl: string;
  };
}

const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  provider: 'localhost',
  localhost: {
    uploadDir: 'apps/web/public/recipes/images',
    publicPrefix: '/recipes/images',
    recipesJsonDir: 'apps/web/public/recipes',
    maxSizeMb: 10,
    allowedTypes: 'image/jpeg, image/png, image/webp, image/gif, image/avif',
  },
  supabase: {
    enabled: true,
    endpoint: 'https://tnhrkjtujdfgvwhsuuxb.storage.supabase.co/storage/v1/s3',
    region: 'us-west-1',
    accessKeyId: 'f3e0affef5c74972a535153349eb24cc',
    secretAccessKey: '',
    bucket: 'recipes',
    publicUrl: 'https://tnhrkjtujdfgvwhsuuxb.supabase.co/storage/v1/object/public/recipes',
  },
};

interface TemplateMeal {
  id: string;
  dayIndex: number;
  mealType: string;
  recipeId?: string;
  recipe_id?: string;
  recipeName?: string;
  title: string;
  image?: string;
  imageUrl?: string;
  image_url?: string;
  time?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  notes?: string;
  ingredients?: any[];
  instructions?: any[];
}

interface MealTemplate {
  id: string;
  userId?: string;
  user_id?: string;
  title: string;
  description?: string;
  category?: string;
  totalDays?: number;
  durationDays?: number;
  isPublic?: boolean;
  meals: TemplateMeal[];
  days?: { dayName?: string; meals?: any[] }[];
  createdAt?: string;
  updatedAt?: string;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const DEFAULT_TEMPLATES: MealTemplate[] = [
  {
    id: 'tpl_default_1',
    userId: 'usr_admin_1',
    title: 'High-Protein Wholesome Week',
    description: 'Balanced lean meats, complex carbohydrates, and vibrant greens designed for active lifestyles.',
    category: 'High-Protein',
    totalDays: 7,
    meals: [
      { 
        id: 'm_1_0', 
        dayIndex: 0, 
        mealType: 'Dinner', 
        title: 'Garlic Butter Chicken Breast',
        recipeName: 'Garlic Butter Chicken Breast', 
        imageUrl: 'default.jpg',
        prepMinutes: 15, 
        cookMinutes: 20, 
        servings: 2,
        ingredients: [
          { name: 'Chicken Breast', amount: '2', unit: 'pieces' },
          { name: 'Garlic Cloves (minced)', amount: '4', unit: 'cloves' },
          { name: 'Butter', amount: '2', unit: 'tbsp' },
          { name: 'Olive Oil', amount: '1', unit: 'tbsp' }
        ],
        instructions: [
          'Season chicken breasts generously with salt, pepper, and garlic powder.',
          'Heat olive oil and butter in a large skillet over medium-high heat.',
          'Sear chicken for 6-8 minutes per side until golden brown and cooked through.',
          'Baste continuously with melted garlic butter and serve warm.'
        ]
      },
      { 
        id: 'm_1_1', 
        dayIndex: 1, 
        mealType: 'Dinner', 
        title: 'Grilled Salmon with Asparagus',
        recipeName: 'Grilled Salmon with Asparagus', 
        imageUrl: 'default.jpg',
        prepMinutes: 10, 
        cookMinutes: 15, 
        servings: 2,
        ingredients: [
          { name: 'Salmon Fillets', amount: '2', unit: 'fillets' },
          { name: 'Fresh Asparagus', amount: '1', unit: 'bunch' },
          { name: 'Lemon Juice', amount: '2', unit: 'tbsp' }
        ],
        instructions: [
          'Preheat grill pan to medium-high heat.',
          'Toss asparagus with olive oil, salt, and pepper.',
          'Grill salmon and asparagus for 4-5 minutes per side until flaky.'
        ]
      }
    ]
  },
  {
    id: 'tpl_default_2',
    userId: 'usr_admin_1',
    title: 'Quick 20-Minute Dinners',
    description: 'Fast weeknight family favorites with minimal prep and cleanup.',
    category: 'Quick & Easy',
    totalDays: 5,
    meals: [
      { 
        id: 'm_2_0', 
        dayIndex: 0, 
        mealType: 'Dinner', 
        title: 'Creamy Pesto Penne Pasta',
        recipeName: 'Creamy Pesto Penne Pasta', 
        imageUrl: 'default.jpg',
        prepMinutes: 5, 
        cookMinutes: 15, 
        servings: 4,
        ingredients: [
          { name: 'Penne Pasta', amount: '400', unit: 'g' },
          { name: 'Basil Pesto', amount: '1', unit: 'jar' },
          { name: 'Heavy Cream', amount: '0.5', unit: 'cup' }
        ],
        instructions: [
          'Boil penne pasta in salted water until al dente.',
          'Drain pasta, reserving 1/4 cup pasta water.',
          'Stir in basil pesto and cream until velvety and serve warm.'
        ]
      }
    ]
  }
];

const getDefaultImageUrl = (config?: StorageConfig | null): string => {
  if (config?.provider === 'supabase' && config.supabase?.publicUrl) {
    const base = config.supabase.publicUrl.replace(/\/+$/, '');
    return `${base}/default.jpg`;
  }
  const prefix = config?.localhost?.publicPrefix || '/recipes/images';
  return `${prefix.replace(/\/+$/, '')}/default.jpg`;
};

const getTemplateMealsCount = (tmpl?: MealTemplate | null): number => {
  if (!tmpl) return 0;
  if (Array.isArray(tmpl.meals)) return tmpl.meals.length;
  if (Array.isArray(tmpl.days)) {
    return tmpl.days.reduce((acc: number, d: any) => {
      return acc + (Array.isArray(d?.meals) ? d.meals.length : 0);
    }, 0);
  }
  return 0;
};

export default function TemplatesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [authHydrated, setAuthHydrated] = useState<boolean>(false);

  const [storageConfig, setStorageConfig] = useState<StorageConfig>(DEFAULT_STORAGE_CONFIG);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal 1: Create / Edit Blueprint
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState<string>('');
  const [templateDesc, setTemplateDesc] = useState<string>('');
  const [templateCategory, setTemplateCategory] = useState<string>('General');
  const [templateDays, setTemplateDays] = useState<number>(7);

  // Modal 2: Add Meal to Day
  const [showMealModal, setShowMealModal] = useState<boolean>(false);
  const [targetDayIndex, setTargetDayIndex] = useState<number>(0);
  const [targetMealType, setTargetMealType] = useState<string>('Dinner');
  const [targetDishTitle, setTargetDishTitle] = useState<string>('');
  const [targetTime, setTargetTime] = useState<string>('19:00');
  const [targetServings, setTargetServings] = useState<number>(4);
  const [targetCookingTime, setTargetCookingTime] = useState<number>(30);
  const [targetNotes, setTargetNotes] = useState<string>('');
  const [selectedRecipeForMeal, setSelectedRecipeForMeal] = useState<any | null>(null);

  // Modal 3: Saved Recipe Picker Modal
  const [showRecipePicker, setShowRecipePicker] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');

  // Modal 4: Apply to Calendar
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [applyStartDate, setApplyStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Modal 5: Full Recipe Card Modal (READ-ONLY, WITHOUT EDITING BUTTON)
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState<boolean>(false);
  const [selectedRecipeForModal, setSelectedRecipeForModal] = useState<any | null>(null);
  const [modalServings, setModalServings] = useState<number>(4);
  const [modalBaseServings, setModalBaseServings] = useState<number>(4);
  const [fontSizeScale, setFontSizeScale] = useState<number>(100);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTemplateModal(false);
        setShowMealModal(false);
        setShowRecipePicker(false);
        setShowApplyModal(false);
        setShowRecipeDetailModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadStorageSettings = useCallback(async () => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('zecratary_storage_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.provider) {
            setStorageConfig(prev => ({ ...prev, ...parsed }));
          }
        }
      } catch (_) {}
    }

    try {
      const res = await fetch(`/api/admin/storage?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const settings = data?.settings || data?.storage_settings;
        if (settings) {
          setStorageConfig(prev => ({
            ...prev,
            ...settings,
            localhost: { ...prev.localhost, ...(settings.localhost || {}) },
            supabase: { ...prev.supabase, ...(settings.supabase || {}) }
          }));
          if (typeof window !== 'undefined') {
            localStorage.setItem('zecratary_storage_settings', JSON.stringify(settings));
          }
        }
      }
    } catch (_) {}
  }, []);

  const resolveRecipeImageUrl = useCallback((img?: string): string => {
    const defaultImg = getDefaultImageUrl(storageConfig);
    if (!img || img === 'default.jpg' || img === '/recipes/images/default.jpg' || img === '/uploads/recipes/default.jpg') {
      return defaultImg;
    }

    const trimmed = img.trim();
    if (!trimmed) return defaultImg;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }

    const cleanFilename = trimmed.replace(/^\/?(recipes\/images\/|uploads\/recipes\/)?/, '');

    if (storageConfig.provider === 'supabase' && storageConfig.supabase?.publicUrl) {
      const base = storageConfig.supabase.publicUrl.replace(/\/+$/, '');
      return `${base}/${cleanFilename}`;
    }

    const prefix = (storageConfig.localhost?.publicPrefix || '/recipes/images').replace(/\/+$/, '');
    return `${prefix}/${cleanFilename}`;
  }, [storageConfig]);

  const normalizeTemplates = useCallback((rawList: any[]): MealTemplate[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map((t: any) => {
      let flatMeals: TemplateMeal[] = [];

      if (Array.isArray(t.meals)) {
        flatMeals = t.meals.map((m: any, mIdx: number) => ({
          id: m.id || `m_${Date.now()}_${mIdx}`,
          dayIndex: Number(m.dayIndex ?? m.day_index ?? 0),
          mealType: m.mealType || m.meal_type || 'Dinner',
          recipeId: m.recipeId || m.recipe_id,
          recipe_id: m.recipe_id || m.recipeId,
          recipeName: m.recipeName || m.title || 'Scheduled Meal',
          title: m.title || m.recipeName || 'Scheduled Meal',
          image: m.image || m.imageUrl || m.image_url || 'default.jpg',
          imageUrl: m.imageUrl || m.image || m.image_url || 'default.jpg',
          image_url: m.image_url || m.imageUrl || m.image || 'default.jpg',
          time: m.time || '19:00',
          servings: Number(m.servings || 4),
          prepMinutes: Number(m.prepMinutes || m.prepTimeMinutes || 15),
          cookMinutes: Number(m.cookMinutes || m.cookTimeMinutes || 25),
          notes: m.notes || '',
          ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
          instructions: Array.isArray(m.instructions) ? m.instructions : []
        }));
      } else if (Array.isArray(t.days)) {
        t.days.forEach((d: any, dIdx: number) => {
          if (Array.isArray(d?.meals)) {
            d.meals.forEach((m: any, mIdx: number) => {
              flatMeals.push({
                id: m.id || `m_${dIdx}_${mIdx}_${Date.now()}`,
                dayIndex: dIdx,
                mealType: m.mealType || 'Dinner',
                recipeId: m.recipeId || m.recipe_id,
                recipe_id: m.recipe_id || m.recipeId,
                recipeName: m.recipeName || m.title || 'Scheduled Meal',
                title: m.title || m.recipeName || 'Scheduled Meal',
                image: m.image || m.imageUrl || m.image_url || 'default.jpg',
                imageUrl: m.imageUrl || m.image || m.image_url || 'default.jpg',
                image_url: m.image_url || m.imageUrl || m.image || 'default.jpg',
                time: m.time || '19:00',
                servings: Number(m.servings || 4),
                prepMinutes: Number(m.prepMinutes || 15),
                cookMinutes: Number(m.cookMinutes || 25),
                notes: m.notes || '',
                ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
                instructions: Array.isArray(m.instructions) ? m.instructions : []
              });
            });
          }
        });
      }

      const totalDays = Number(t.totalDays || t.durationDays || t.duration_days) || 7;

      return {
        id: t.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: t.userId || t.user_id || 'usr_admin_1',
        title: t.title || 'Untitled Blueprint',
        description: t.description || '',
        category: t.category || 'General',
        totalDays,
        durationDays: totalDays,
        meals: flatMeals,
        createdAt: t.createdAt || t.created_at || new Date().toISOString()
      };
    });
  }, []);

  const loadTemplatesData = useCallback(async (user: User | null) => {
    const targetUserId = user?.id || 'usr_admin_1';
    setLoading(true);

    try {
      let fetchedTemplates: MealTemplate[] = [];

      try {
        const res = await fetch(`/api/templates?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.templates) && data.templates.length > 0) {
            fetchedTemplates = normalizeTemplates(data.templates);
          }
        }
      } catch (_) {}

      if (fetchedTemplates.length === 0 && typeof window !== 'undefined') {
        const raw = localStorage.getItem('zecratary_meal_templates');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              fetchedTemplates = normalizeTemplates(parsed);
            }
          } catch (_) {}
        }
      }

      if (fetchedTemplates.length === 0) {
        fetchedTemplates = normalizeTemplates(DEFAULT_TEMPLATES);
      }

      setTemplates(fetchedTemplates);
      if (!selectedTemplateId && fetchedTemplates.length > 0) {
        setSelectedTemplateId(fetchedTemplates[0].id);
      }

      try {
        const rRes = await fetch(`/api/saved-recipes?userId=${encodeURIComponent(targetUserId)}&t=${Date.now()}`, { cache: 'no-store' });
        if (rRes.ok) {
          const rData = await rRes.json();
          const rList = Array.isArray(rData) ? rData : (rData?.recipes || []);
          setSavedRecipes(rList);
        }
      } catch (_) {}

    } catch (e) {
      console.warn('[TemplatesPage] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [normalizeTemplates, selectedTemplateId]);

  useEffect(() => {
    initAuthStorage();
    loadStorageSettings();

    let resolvedUser = getCurrentUser();
    if (!resolvedUser && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)(?:zecratary_session|zecratary_current_user|currentUser)=([^;]+)/);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[1]));
          if (parsed && parsed.email) {
            resolvedUser = parsed;
            setCurrentUser(parsed);
          }
        } catch (_) {}
      }
    }

    if (!resolvedUser) {
      setAuthHydrated(true);
      router.replace('/login');
      return;
    }

    setCurrentUserState(resolvedUser);
    setAuthHydrated(true);
    loadTemplatesData(resolvedUser);

    const handleStorageChange = (e?: any) => {
      if (e?.detail) {
        setStorageConfig(prev => ({ ...prev, ...e.detail }));
      } else {
        loadStorageSettings();
      }
    };

    const handleSync = () => {
      const active = getCurrentUser();
      if (active) {
        setCurrentUserState(active);
        loadTemplatesData(active);
        loadStorageSettings();
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', loadStorageSettings);
    window.addEventListener('zecratary_storage_updated', handleStorageChange);
    window.addEventListener('zecratary_saved_recipes_updated', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', loadStorageSettings);
      window.removeEventListener('zecratary_storage_updated', handleStorageChange);
      window.removeEventListener('zecratary_saved_recipes_updated', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [loadStorageSettings, loadTemplatesData, router]);

  const activeTemplate = useMemo(() => {
    return templates.find(tpl => tpl.id === selectedTemplateId) || templates[0] || null;
  }, [templates, selectedTemplateId]);

  const persistTemplatesList = async (updatedList: MealTemplate[]) => {
    setTemplates(updatedList);
    const targetUserId = currentUser?.id || 'usr_admin_1';

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('zecratary_meal_templates', JSON.stringify(updatedList));
      } catch (_) {}
    }

    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, createdBy: currentUser?.email, templates: updatedList })
      });
    } catch (_) {}

    window.dispatchEvent(new Event('storage'));
  };

  const handleOpenRecipeModal = (meal: TemplateMeal) => {
    const matched = savedRecipes.find(r => 
      (meal.recipeId && r.id === meal.recipeId) ||
      (r.title && r.title.toLowerCase() === (meal.recipeName || meal.title).toLowerCase()) ||
      (r.name && r.name.toLowerCase() === (meal.recipeName || meal.title).toLowerCase())
    );

    const baseServings = Number(matched?.servings || meal.servings || 4);

    const fullRecipePayload = {
      id: matched?.id || meal.recipeId || meal.id,
      title: matched?.title || matched?.name || meal.recipeName || meal.title,
      image: matched?.imageUrl || matched?.image || meal.imageUrl || meal.image || 'default.jpg',
      imageUrl: matched?.imageUrl || matched?.image || meal.imageUrl || meal.image || 'default.jpg',
      category: matched?.category || matched?.recipeType || meal.mealType || 'Main Dish',
      prepTimeMinutes: matched?.prepTimeMinutes || meal.prepMinutes || 15,
      cookTimeMinutes: matched?.cookTimeMinutes || meal.cookMinutes || 25,
      calories: matched?.calories || matched?.nutrition?.calories || 480,
      servings: baseServings,
      sourceUrl: matched?.sourceUrl || matched?.source_url || '',
      ingredients: (matched?.ingredients && matched.ingredients.length > 0)
        ? matched.ingredients
        : (meal.ingredients && meal.ingredients.length > 0)
          ? meal.ingredients
          : [
              { name: meal.recipeName || meal.title, amount: String(baseServings), unit: 'servings' },
              { name: 'Olive Oil or Cooking Spray', amount: '1', unit: 'tbsp' },
              { name: 'Salt & Black Pepper', amount: '1', unit: 'pinch' }
            ],
      instructions: (matched?.instructions && matched.instructions.length > 0)
        ? matched.instructions
        : (meal.instructions && meal.instructions.length > 0)
          ? meal.instructions
          : [
              `Prepare all fresh ingredients for ${meal.recipeName || meal.title}.`,
              `Cook according to instructions for ${(meal.prepMinutes || 15) + (meal.cookMinutes || 25)} minutes.`,
              `Season to taste and serve fresh.`
            ],
      notes: meal.notes || matched?.notes || ''
    };

    setSelectedRecipeForModal(fullRecipePayload);
    setModalServings(baseServings);
    setModalBaseServings(baseServings);
    setFontSizeScale(100);
    setCheckedIngredients({});
    setCheckedSteps({});
    setShowRecipeDetailModal(true);
  };

  const handleSaveTemplateModal = async () => {
    if (!templateTitle.trim() || !currentUser) return;

    if (editingTemplateId) {
      const updated = templates.map(tpl => {
        if (tpl.id === editingTemplateId) {
          return {
            ...tpl,
            title: templateTitle.trim(),
            description: templateDesc.trim(),
            category: templateCategory,
            totalDays: Number(templateDays || 7),
            durationDays: Number(templateDays || 7)
          };
        }
        return tpl;
      });
      await persistTemplatesList(updated);
      showToast(t('blueprintSavedToast', 'Blueprint saved to database!'));
    } else {
      const newTpl: MealTemplate = {
        id: 'tpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        userId: currentUser.id || 'usr_admin_1',
        title: templateTitle.trim(),
        description: templateDesc.trim(),
        category: templateCategory,
        totalDays: Number(templateDays || 7),
        durationDays: Number(templateDays || 7),
        meals: []
      };
      const updated = [newTpl, ...templates];
      await persistTemplatesList(updated);
      setSelectedTemplateId(newTpl.id);
      showToast(t('blueprintCreatedToast', 'Blueprint created successfully!'));
    }

    setShowTemplateModal(false);
  };

  const handleOpenEditTemplate = (e: React.MouseEvent, tpl: MealTemplate) => {
    e.stopPropagation();
    setEditingTemplateId(tpl.id);
    setTemplateTitle(tpl.title);
    setTemplateDesc(tpl.description || '');
    setTemplateCategory(tpl.category || 'General');
    setTemplateDays(tpl.totalDays || 7);
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('confirmDeleteBlueprint', 'Are you sure you want to delete this meal blueprint?'))) return;

    const updated = templates.filter(t => t.id !== id);
    await persistTemplatesList(updated);

    if (selectedTemplateId === id) {
      setSelectedTemplateId(updated[0]?.id || null);
    }

    try {
      await fetch(`/api/templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) {}

    showToast(t('blueprintDeletedToast', 'Blueprint deleted successfully.'));
  };

  const handleOpenAddMeal = (dayIdx: number, slot: string = 'Dinner') => {
    setTargetDayIndex(dayIdx);
    setTargetMealType(slot);
    setTargetDishTitle('');
    setTargetTime('19:00');
    setTargetServings(4);
    setTargetCookingTime(30);
    setTargetNotes('');
    setSelectedRecipeForMeal(null);
    setShowMealModal(true);
  };

  const handleSaveMealToBlueprint = async () => {
    if (!targetDishTitle.trim() || !activeTemplate) return;

    const defaultImg = getDefaultImageUrl(storageConfig);
    const chosenImg = selectedRecipeForMeal?.imageUrl || selectedRecipeForMeal?.image || defaultImg;

    const newMeal: TemplateMeal = {
      id: 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      dayIndex: targetDayIndex,
      mealType: targetMealType,
      recipeId: selectedRecipeForMeal?.id || undefined,
      recipe_id: selectedRecipeForMeal?.id || undefined,
      recipeName: targetDishTitle.trim(),
      title: targetDishTitle.trim(),
      image: chosenImg,
      imageUrl: chosenImg,
      image_url: chosenImg,
      time: targetTime || '19:00',
      servings: Number(targetServings || 4),
      prepMinutes: Number(selectedRecipeForMeal?.prepTimeMinutes || selectedRecipeForMeal?.prepMinutes || 15),
      cookMinutes: Number(selectedRecipeForMeal?.cookTimeMinutes || selectedRecipeForMeal?.cookMinutes || 25),
      notes: targetNotes.trim(),
      ingredients: selectedRecipeForMeal?.ingredients || [],
      instructions: selectedRecipeForMeal?.instructions || []
    };

    const updatedMeals = [...(activeTemplate.meals || []), newMeal];
    const updated = templates.map(tpl => tpl.id === activeTemplate.id ? { ...tpl, meals: updatedMeals } : tpl);

    await persistTemplatesList(updated);
    setShowMealModal(false);
    showToast(
      (t('mealAddedToast', 'Added {title} to Day {day}!'))
        .replace('{title}', newMeal.title)
        .replace('{day}', String(targetDayIndex + 1))
    );
  };

  const handleRemoveMealFromBlueprint = async (mealId: string) => {
    if (!activeTemplate) return;
    const updatedMeals = (activeTemplate.meals || []).filter(m => m.id !== mealId);
    const updated = templates.map(tpl => tpl.id === activeTemplate.id ? { ...tpl, meals: updatedMeals } : tpl);
    await persistTemplatesList(updated);
    showToast(t('mealRemovedToast', 'Meal removed from blueprint.'));
  };

  const handleApplyToCalendar = async () => {
    if (!activeTemplate || !activeTemplate.meals || activeTemplate.meals.length === 0) return;
    const targetUserId = currentUser?.id || 'usr_admin_1';

    const [y, m, d] = applyStartDate.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);

    const scheduledMeals = activeTemplate.meals.map((meal, idx) => {
      const mealDate = new Date(baseDate);
      mealDate.setDate(mealDate.getDate() + (meal.dayIndex || 0));
      const dateStr = mealDate.toISOString().split('T')[0];

      return {
        id: 'plan_' + Date.now() + '_' + idx,
        userId: targetUserId,
        user_id: targetUserId,
        createdBy: currentUser?.email || 'admin@zecratary.com',
        date: dateStr,
        recipeId: meal.recipeId || null,
        recipe_id: meal.recipeId || null,
        recipeName: meal.recipeName || meal.title,
        title: meal.recipeName || meal.title,
        image: resolveRecipeImageUrl(meal.image || meal.imageUrl),
        imageUrl: resolveRecipeImageUrl(meal.image || meal.imageUrl),
        image_url: resolveRecipeImageUrl(meal.image || meal.imageUrl),
        mealType: meal.mealType || 'Dinner',
        time: meal.time || '19:00',
        servings: Number(meal.servings || 4),
        prepTimeMinutes: Number(meal.prepMinutes || 15),
        cookTimeMinutes: Number(meal.cookMinutes || 25),
        notes: meal.notes || `Applied from ${activeTemplate.title}`
      };
    });

    try {
      await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meals: scheduledMeals })
      });
      window.dispatchEvent(new Event('zecratary_planner_updated'));
      showToast(t('templateAppliedSuccessToast', 'Meal blueprint scheduled onto your calendar!'));
      setShowApplyModal(false);
      router.push('/planner');
    } catch (_) {
      showToast(t('templateAppliedErrorToast', 'Error applying template to planner.'), 'error');
    }
  };

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return templates;
    return templates.filter(tpl => 
      tpl.title.toLowerCase().includes(q) ||
      (tpl.description || '').toLowerCase().includes(q) ||
      (tpl.category || '').toLowerCase().includes(q)
    );
  }, [templates, search]);

  const filteredPickerRecipes = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    if (!q) return savedRecipes;
    return savedRecipes.filter(r => 
      (r.title || r.name || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    );
  }, [savedRecipes, pickerSearch]);

  const activeProviderLabel = storageConfig.provider === 'supabase' ? 'Supabase S3' : 'Localhost';
  const activePrefixLabel = storageConfig.provider === 'supabase' 
    ? (storageConfig.supabase?.publicUrl || 'Cloud CDN')
    : (storageConfig.localhost?.publicPrefix || '/recipes/images');

  if (!authHydrated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div 
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
        <p className="text-xs opacity-60">{t('authenticatingSession', 'Authenticating session...')}</p>
      </div>
    );
  }

  return (
    <div 
      id="zecratary-templates-canvas"
      role="region"
      aria-label={t('mealBlueprintsTitle', 'Meal Blueprints & Templates')}
      data-lpignore="true"
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 font-sans transition-colors duration-200"
      style={{ 
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        color: 'var(--color-text)' 
      }}
    >
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: toastMessage.type === 'success' ? 'var(--color-emerald)' : '#ef4444',
            color: 'var(--color-text)'
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
              {t('mealBlueprintsTitle', 'Meal Blueprints & Templates')}
            </h1>
            <span 
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold shadow-xs"
              style={{ 
                backgroundColor: 'var(--color-inner-dark)', 
                borderColor: storageConfig.provider === 'supabase' ? 'var(--color-primary)' : 'var(--color-border)',
                color: storageConfig.provider === 'supabase' ? 'var(--color-primary)' : 'var(--color-text)'
              }}
              title={`${t('activeEngine', 'Active Engine')}: ${activeProviderLabel} (${activePrefixLabel})`}
            >
              <HardDrive className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
              <span>{activeProviderLabel}: {activePrefixLabel}</span>
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('mealBlueprintsSubtitle', 'Schedule and customize multi-day meal templates with dynamic images synchronized with storage settings.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              loadTemplatesData(currentUser);
              loadStorageSettings();
            }}
            disabled={loading}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>{t('reloadBtn', 'Reload')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTemplateId(null);
              setTemplateTitle('');
              setTemplateDesc('');
              setTemplateCategory('General');
              setTemplateDays(7);
              setShowTemplateModal(true);
            }}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-4 w-4" /> {t('newBlueprintBtn', 'New Blueprint')}
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: BLUEPRINTS CATALOG */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div role="region" data-lpignore="true" className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-3 pointer-events-none opacity-60" />
            <input
              type="text"
              autoComplete="off"
              data-lpignore="true"
              placeholder={t('searchBlueprintsPlaceholder', 'Search blueprints by title or category...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none transition font-medium"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div className="space-y-3">
            {filteredTemplates.length === 0 ? (
              <div className="p-8 text-center text-xs opacity-50 border rounded-2xl" style={{ borderColor: 'var(--color-border)' }}>
                {t('noBlueprintsFound', 'No Blueprints Found')}
              </div>
            ) : (
              filteredTemplates.map(tpl => {
                const isSelected = tpl.id === activeTemplate?.id;
                const mealCount = getTemplateMealsCount(tpl);

                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className="p-4 rounded-3xl border transition cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between space-y-2.5 group"
                    style={isSelected ? {
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-primary)',
                      borderWidth: '2px'
                    } : {
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                          {t(`cat${(tpl.category || 'General').replace(/[^a-zA-Z]/g, '')}`, tpl.category || 'General')}
                        </span>
                        <h3 className="font-extrabold text-sm leading-snug truncate" style={{ color: 'var(--color-text)' }}>
                          {tpl.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditTemplate(e, tpl)}
                          className="p-1 rounded-lg hover:bg-slate-800/30 transition text-slate-400 hover:text-white"
                          title={t('editBlueprint', 'Edit Blueprint')}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplate(e, tpl.id)}
                          className="p-1 rounded-lg hover:bg-red-500/10 transition text-red-400"
                          title={t('deleteBlueprint', 'Delete Blueprint')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] leading-relaxed opacity-75 line-clamp-2">
                      {tpl.description || t('emptyDayDesc', 'Weekly meal plan blueprint.')}
                    </p>

                    <div className="pt-2 border-t flex items-center justify-between text-[10px] font-bold opacity-80" style={{ borderColor: 'var(--color-border)' }}>
                      <span className="text-emerald-500 font-bold">
                        {(t('totalMealsCount', '{count} Meals Total')).replace('{count}', String(mealCount))}
                      </span>
                      <span>
                        {(t('durationDays', '{days} Days Duration')).replace('{days}', String(tpl.totalDays || 7))}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WORKBENCH CANVAS */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {activeTemplate ? (
            <div 
              role="region"
              data-lpignore="true"
              className="w-full max-w-full border rounded-3xl p-6 space-y-6 shadow-sm transition-colors duration-200"
              style={{ 
                backgroundColor: 'var(--color-card)', 
                borderColor: 'var(--color-border)',
                boxSizing: 'border-box'
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase text-emerald-400" style={{ borderColor: 'var(--color-border)' }}>
                      {t(`cat${(activeTemplate.category || 'General').replace(/[^a-zA-Z]/g, '')}`, activeTemplate.category || 'General')}
                    </span>
                    <span className="text-xs opacity-60">
                      {(t('durationDays', '{days} Days Duration')).replace('{days}', String(activeTemplate.totalDays || 7))}
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-1" style={{ color: 'var(--color-text)' }}>
                    {activeTemplate.title}
                  </h2>
                  {activeTemplate.description && (
                    <p className="text-xs opacity-75 mt-0.5">{activeTemplate.description}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowApplyModal(true)}
                  disabled={!activeTemplate.meals || activeTemplate.meals.length === 0}
                  className="px-4 py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg hover:opacity-90 cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span>{t('applyToCalendarBtn', 'Apply to Calendar')}</span>
                </button>
              </div>

              {/* Day Breakdown Cards */}
              <div className="space-y-4">
                {DAY_NAMES.slice(0, activeTemplate.totalDays || 7).map((dayName, dayIdx) => {
                  const dayMeals = (activeTemplate.meals || []).filter(m => m.dayIndex === dayIdx);
                  const dayNameKey = `day${dayName}`;
                  const localizedDayName = t(dayNameKey, dayName);

                  return (
                    <div 
                      key={dayIdx}
                      className="border rounded-2xl p-4 space-y-3 shadow-xs"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs text-[var(--color-primary)]" style={{ borderColor: 'var(--color-border)' }}>
                            {dayIdx + 1}
                          </span>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                            {localizedDayName}
                          </h4>
                        </div>

                        {/* ADD RECIPE / DISH TO THIS DAY BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleOpenAddMeal(dayIdx, 'Dinner')}
                          className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{(t('addMealToDay', 'Add Recipe to {day}')).replace('{day}', localizedDayName)}</span>
                        </button>
                      </div>

                      {dayMeals.length === 0 ? (
                        <div className="py-4 text-center text-[11px] opacity-40">
                          {(t('emptyDaySchedulePrompt', "No recipes scheduled for {dayName}. Click '+ Add Recipe to {dayName}' to select a dish."))
                            .replace(/{dayName}/g, localizedDayName)}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                          {dayMeals.map(meal => {
                            const resolvedThumb = resolveRecipeImageUrl(meal.imageUrl || meal.image);
                            const defaultThumb = getDefaultImageUrl(storageConfig);

                            return (
                              <div 
                                key={meal.id}
                                onClick={() => handleOpenRecipeModal(meal)}
                                className="p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-xs group cursor-pointer hover:border-[var(--color-primary)] transition-all duration-200"
                                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                                title={t('inspectRecipeDetails', 'Click to inspect full recipe details (Without Editing)')}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Recipe Thumbnail */}
                                  <div 
                                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden shrink-0 border relative bg-slate-900/40"
                                    style={{ borderColor: 'var(--color-border)' }}
                                  >
                                    <img 
                                      src={resolvedThumb} 
                                      alt={meal.recipeName || meal.title}
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = defaultThumb;
                                      }}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  </div>

                                  {/* Recipe Info */}
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border text-emerald-400" style={{ borderColor: 'var(--color-border)' }}>
                                        {t(`slot${meal.mealType}`, meal.mealType)}
                                      </span>
                                      {meal.time && (
                                        <span className="text-[10px] font-mono opacity-60">
                                          {meal.time}
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="font-bold text-xs truncate group-hover:text-[var(--color-primary)] transition-colors" style={{ color: 'var(--color-text)' }}>
                                      {meal.recipeName || meal.title}
                                    </h5>
                                    <div className="flex items-center gap-3 text-[10px] opacity-75 font-mono">
                                      <span>{(t('servingsAbbr', '{count} serv')).replace('{count}', String(meal.servings || 4))}</span>
                                      <span>{(t('minutesAbbr', '{count}m')).replace('{count}', String((meal.prepMinutes || 15) + (meal.cookMinutes || 25)))}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Remove Meal Button */}
                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMealFromBlueprint(meal.id)}
                                    className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
                                    title={t('removeMealTitle', 'Remove recipe from day')}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs opacity-50 border rounded-3xl" style={{ borderColor: 'var(--color-border)' }}>
              {t('noBlueprintsFound', 'No Blueprints Found')}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 2: ADD RECIPE TO BLUEPRINT DAY */}
      {showMealModal && (
        <div 
          onClick={() => setShowMealModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="meal-modal-title"
            data-lpignore="true"
            className="border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 id="meal-modal-title" className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {(t('addMealToDay', 'Add Recipe to {day}')).replace('{day}', t(`day${DAY_NAMES[targetDayIndex]}`, DAY_NAMES[targetDayIndex]))}
              </h3>
              <button type="button" onClick={() => setShowMealModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Button to Launch Saved Recipe Picker Modal */}
              <button
                type="button"
                onClick={() => setShowRecipePicker(true)}
                className="w-full py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer hover:opacity-80 transition"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {selectedRecipeForMeal ? (selectedRecipeForMeal.title || selectedRecipeForMeal.name) : t('selectFromSavedRecipes', 'Select from Saved Recipes Library')}
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('customDishTitleLabel', 'Dish Title *')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  placeholder={t('dishTitlePlaceholder', 'e.g. Grilled Salmon with Asparagus')}
                  value={targetDishTitle}
                  onChange={(e) => setTargetDishTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveMealToBlueprint();
                    }
                  }}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none font-medium"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('mealSlotLabel', 'Meal Slot')}</label>
                  <select
                    value={targetMealType}
                    onChange={(e) => setTargetMealType(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {MEAL_SLOTS.map(s => (
                      <option key={s} value={s}>{t(`slot${s}`, s)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('servingsLabel', 'Servings')}</label>
                  <input
                    type="number"
                    min="1"
                    autoComplete="off"
                    data-lpignore="true"
                    value={targetServings}
                    onChange={(e) => setTargetServings(parseInt(e.target.value) || 1)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('notesLabel', 'Notes / Instructions')}</label>
                <textarea
                  rows={2}
                  autoComplete="off"
                  data-lpignore="true"
                  placeholder={t('notesPlaceholder', 'Notes, prep reminders, or substitutions...')}
                  value={targetNotes}
                  onChange={(e) => setTargetNotes(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none resize-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowMealModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveMealToBlueprint}
                  disabled={!targetDishTitle.trim()}
                  className="px-5 py-2 text-white font-bold rounded-xl shadow cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('addToBlueprintBtn', 'Add to Blueprint')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SAVED RECIPES PICKER MODAL */}
      {showRecipePicker && (
        <div 
          onClick={() => setShowRecipePicker(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recipe-picker-title"
            data-lpignore="true"
            className="border rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative p-5 space-y-3 cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
              <h3 id="recipe-picker-title" className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {t('selectFromSavedRecipes', 'Select from Saved Recipes Library')}
              </h3>
              <button type="button" onClick={() => setShowRecipePicker(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 pointer-events-none opacity-60" />
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                placeholder={t('searchRecipesPlaceholder', 'Search your saved recipes...')}
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar max-h-80">
              {filteredPickerRecipes.length === 0 ? (
                <div className="py-8 text-center text-xs opacity-50">
                  {t('noRecipesFound', 'No recipes found in your saved library.')}
                </div>
              ) : (
                filteredPickerRecipes.map(recipe => {
                  const pickerThumb = resolveRecipeImageUrl(recipe.imageUrl || recipe.image);
                  const defaultThumb = getDefaultImageUrl(storageConfig);

                  return (
                    <div
                      key={recipe.id}
                      onClick={() => {
                        setSelectedRecipeForMeal(recipe);
                        setTargetDishTitle(recipe.title || recipe.name);
                        setTargetServings(Number(recipe.servings || 4));
                        setTargetCookingTime((recipe.prepTimeMinutes || 15) + (recipe.cookTimeMinutes || 25));
                        setShowRecipePicker(false);
                      }}
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-3 hover:border-[var(--color-primary)] transition cursor-pointer"
                      style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                          src={pickerThumb} 
                          alt={recipe.title || recipe.name} 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = defaultThumb;
                          }}
                          className="w-10 h-10 rounded-lg object-cover border shrink-0" 
                          style={{ borderColor: 'var(--color-border)' }} 
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs truncate">{recipe.title || recipe.name}</h4>
                          <span className="text-[10px] opacity-60 block">{recipe.recipeType || 'Main Dish'}</span>
                        </div>
                      </div>
                      <Check className="h-4 w-4 text-[var(--color-primary)] opacity-0 group-hover:opacity-100" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: FULL RECIPE CARD MODAL (READ-ONLY, WITHOUT EDITING BUTTON) */}
      {showRecipeDetailModal && selectedRecipeForModal && (
        <div 
          onClick={() => setShowRecipeDetailModal(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recipe-detail-title"
            data-lpignore="true"
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden border shadow-2xl relative text-xs cursor-default transition-colors duration-200"
            style={{ 
              backgroundColor: 'var(--color-card)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            {/* Full Hero Image Banner */}
            <div className="relative h-56 sm:h-64 w-full shrink-0 overflow-hidden bg-slate-900">
              <img 
                src={resolveRecipeImageUrl(selectedRecipeForModal.imageUrl || selectedRecipeForModal.image)} 
                alt={selectedRecipeForModal.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getDefaultImageUrl(storageConfig);
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

              <button 
                type="button" 
                onClick={() => setShowRecipeDetailModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition cursor-pointer z-10 border border-white/20"
                title={t('closeBtn', 'Close')}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white tracking-wider border border-white/30" style={{ backgroundColor: 'var(--color-primary)' }}>
                    {selectedRecipeForModal.category || 'Main Dish'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-white/90 bg-white/10 backdrop-blur-xs flex items-center gap-1 border border-white/15">
                    <Clock className="h-3 w-3" />
                    <span>{(t('prepTimeLabel', 'Prep: {time}m')).replace('{time}', String(selectedRecipeForModal.prepTimeMinutes || 15))}</span>
                    <span className="opacity-40">•</span>
                    <span>{(t('cookTimeLabel', 'Cook: {time}m')).replace('{time}', String(selectedRecipeForModal.cookTimeMinutes || 25))}</span>
                  </span>
                  {selectedRecipeForModal.calories && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-white/90 bg-white/10 backdrop-blur-xs flex items-center gap-1 border border-white/15">
                      <Flame className="h-3 w-3 text-orange-400" />
                      <span>{(t('caloriesKcal', '{count} kcal')).replace('{count}', String(selectedRecipeForModal.calories))}</span>
                    </span>
                  )}
                </div>

                <h2 id="recipe-detail-title" className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {selectedRecipeForModal.title}
                </h2>
              </div>
            </div>

            {/* Servings Stepper & Zoom Controls */}
            <div 
              className="p-3.5 border-b flex items-center justify-between gap-4 shrink-0 flex-wrap"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold opacity-75 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                  {t('servingsLabel', 'Servings')}:
                </span>
                <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                  <button
                    type="button"
                    onClick={() => setModalServings(prev => Math.max(1, prev - 1))}
                    className="p-1.5 hover:opacity-80 transition cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="px-3 font-bold font-mono text-xs text-[var(--color-primary)]">
                    {modalServings}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalServings(prev => prev + 1)}
                    className="p-1.5 hover:opacity-80 transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold opacity-75 flex items-center gap-1">
                  <Type className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                  {t('textSizeLabel', 'Text Size:')}
                </span>
                <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                  <button
                    type="button"
                    onClick={() => setFontSizeScale(prev => Math.max(80, prev - 10))}
                    className="p-1.5 hover:opacity-80 transition cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="px-2 font-mono text-xs opacity-80">{fontSizeScale}%</span>
                  <button
                    type="button"
                    onClick={() => setFontSizeScale(prev => Math.min(140, prev + 10))}
                    className="p-1.5 hover:opacity-80 transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ingredients & Instructions (Read-Only) */}
            <div 
              className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar"
              style={{ fontSize: `${(fontSizeScale / 100) * 0.75}rem` }}
            >
              {/* Ingredients */}
              <div className="space-y-3">
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                  <span>{t('ingredientsHeading', 'Ingredients')}</span>
                  <span className="text-[10px] font-normal opacity-60">({selectedRecipeForModal.ingredients?.length || 0})</span>
                </h3>

                {(!selectedRecipeForModal.ingredients || selectedRecipeForModal.ingredients.length === 0) ? (
                  <p className="opacity-60 italic">{t('noIngredientsRecorded', 'No specific ingredients recorded for this dish.')}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRecipeForModal.ingredients.map((ing: any, idx: number) => {
                      const isChecked = !!checkedIngredients[`ing_${idx}`];
                      const rawAmt = typeof ing.amount === 'number' ? ing.amount : parseFloat(ing.amount);
                      const scaledAmt = !isNaN(rawAmt) 
                        ? (rawAmt * (modalServings / modalBaseServings)).toFixed(1).replace(/\.0$/, '')
                        : ing.amount;

                      return (
                        <div 
                          key={idx}
                          onClick={() => setCheckedIngredients(prev => ({ ...prev, [`ing_${idx}`]: !prev[`ing_${idx}`] }))}
                          className="p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition hover:border-[var(--color-primary)]"
                          style={{ 
                            backgroundColor: isChecked ? 'var(--color-inner-dark)' : 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            opacity: isChecked ? 0.6 : 1
                          }}
                        >
                          <div 
                            className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition"
                            style={{ 
                              borderColor: isChecked ? 'var(--color-emerald)' : 'var(--color-border)',
                              backgroundColor: isChecked ? 'var(--color-emerald)' : 'transparent'
                            }}
                          >
                            {isChecked && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className={`min-w-0 flex-1 ${isChecked ? 'line-through opacity-70' : ''}`}>
                            <span className="font-bold text-[var(--color-primary)] mr-1.5">{scaledAmt} {ing.unit}</span>
                            <span className="font-medium">{ing.name || ing}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                  <span>{t('instructionsHeading', 'Step-by-Step Instructions')}</span>
                </h3>

                {(!selectedRecipeForModal.instructions || selectedRecipeForModal.instructions.length === 0) ? (
                  <p className="opacity-60 italic">{t('noInstructionsRecorded', 'No instructions recorded for this dish.')}</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedRecipeForModal.instructions.map((step: any, idx: number) => {
                      const isChecked = !!checkedSteps[idx];
                      const stepText = typeof step === 'string' ? step : step.text || step.instruction;

                      return (
                        <div 
                          key={idx}
                          onClick={() => setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className="p-3.5 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition hover:border-[var(--color-primary)]"
                          style={{ 
                            backgroundColor: isChecked ? 'var(--color-inner-dark)' : 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            opacity: isChecked ? 0.6 : 1
                          }}
                        >
                          <span 
                            className="w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5"
                            style={{ 
                              borderColor: isChecked ? 'var(--color-emerald)' : 'var(--color-primary)',
                              backgroundColor: isChecked ? 'var(--color-emerald)' : 'transparent',
                              color: isChecked ? '#fff' : 'var(--color-primary)'
                            }}
                          >
                            {isChecked ? <Check className="h-3 w-3" /> : idx + 1}
                          </span>
                          <p className={`text-xs leading-relaxed flex-1 ${isChecked ? 'line-through opacity-70' : ''}`}>
                            {stepText}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedRecipeForModal.notes && (
                <div className="p-3 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <span className="font-bold text-[10px] uppercase text-amber-400">{t('blueprintNotesLabel', 'Blueprint Notes')}</span>
                  <p className="text-xs opacity-80">{selectedRecipeForModal.notes}</p>
                </div>
              )}
            </div>

            {/* Read-Only Modal Footer (Strictly WITHOUT Editing Button) */}
            <div 
              className="p-4 border-t flex items-center justify-between gap-4 shrink-0"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div>
                {selectedRecipeForModal.sourceUrl ? (
                  <a
                    href={selectedRecipeForModal.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1.5"
                  >
                    <span>{t('originalRecipeSource', 'Original Recipe Source')}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-[11px] opacity-40">{t('blueprintCatalogFooter', 'Zecratary Blueprint Catalog')}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/chef?recipe=${encodeURIComponent(selectedRecipeForModal.title)}`}
                  className="px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow transition hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <ChefHat className="h-4 w-4" />
                  <span>{t('cookWithChefBtn', 'Cook with AI Chef')}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowRecipeDetailModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-xs hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  {t('closeBtn', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT BLUEPRINT */}
      {showTemplateModal && (
        <div 
          onClick={() => setShowTemplateModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-modal-title"
            data-lpignore="true"
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 id="template-modal-title" className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {editingTemplateId ? t('editBlueprint', 'Edit Blueprint') : t('newBlueprintBtn', 'New Blueprint')}
              </h3>
              <button type="button" onClick={() => setShowTemplateModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 opacity-80">{t('blueprintTitleLabel', 'Blueprint Title *')}</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  placeholder={t('blueprintTitlePlaceholder', 'e.g. High-Protein Muscle Gain...')}
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('blueprintCategoryLabel', 'Category')}</label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {[
                      { key: 'catGeneral', val: 'General' },
                      { key: 'catHighProtein', val: 'High-Protein' },
                      { key: 'catLowCarb', val: 'Low-Carb / Keto' },
                      { key: 'catMediterranean', val: 'Mediterranean' },
                      { key: 'catFamilyFriendly', val: 'Family Friendly' },
                      { key: 'catQuickEasy', val: 'Quick & Easy' }
                    ].map(c => (
                      <option key={c.val} value={c.val}>{t(c.key, c.val)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">{t('durationDaysLabel', 'Duration (Days)')}</label>
                  <select
                    value={templateDays}
                    onChange={(e) => setTemplateDays(Number(e.target.value))}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {[3, 4, 5, 7].map(d => (
                      <option key={d} value={d}>{(t('durationDays', '{days} Days Duration')).replace('{days}', String(d))}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">{t('blueprintDescLabel', 'Description')}</label>
                <textarea
                  rows={2}
                  autoComplete="off"
                  data-lpignore="true"
                  placeholder={t('blueprintDescPlaceholder', 'Short summary of this meal plan blueprint...')}
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none resize-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold hover:opacity-80 transition cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplateModal}
                  disabled={!templateTitle.trim()}
                  className="px-5 py-2 text-white font-bold rounded-xl shadow cursor-pointer hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('saveBlueprintBtn', 'Save Blueprint')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: APPLY TO CALENDAR */}
      {showApplyModal && (
        <div 
          onClick={() => setShowApplyModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-modal-title"
            data-lpignore="true"
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h3 id="apply-modal-title" className="font-extrabold text-sm" style={{ color: 'var(--color-primary)' }}>
                {t('applyModalTitle', 'Schedule Blueprint onto Calendar')}
              </h3>
              <button type="button" onClick={() => setShowApplyModal(false)} className="p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 opacity-80">{t('applyStartDateLabel', 'Target Start Date')}</label>
                <input
                  type="date"
                  autoComplete="off"
                  data-lpignore="true"
                  value={applyStartDate}
                  onChange={(e) => setApplyStartDate(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="p-3 rounded-2xl border text-[11px] opacity-80" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                {(t('schedulingSummaryText', 'Scheduling {count} meals across {days} days starting on {date}.'))
                  .replace('{count}', String((activeTemplate?.meals || []).length))
                  .replace('{days}', String(activeTemplate?.totalDays || 7))
                  .replace('{date}', applyStartDate)}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  {t('cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleApplyToCalendar}
                  className="px-5 py-2 text-white font-bold rounded-xl shadow cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('confirmApplyBtn', 'Confirm & Apply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
