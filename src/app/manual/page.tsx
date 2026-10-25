'use client';
// @ts-nocheck

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Trash2, Save, ArrowLeft, ImagePlus, GripVertical, 
  ArrowUp, ArrowDown, CheckCircle2, AlertCircle, X, Sparkles, 
  Flame, Clock, Users, Utensils, Tag, Activity
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useRecipeTypes } from '@/lib/recipe-types';
import { useIngredientCategories } from '@/lib/categories';
import { useTranslation } from '@/components/LanguageProvider';

interface IngredientItem {
  amount: string;
  unit: string;
  item: string;
  category: string;
}

const DEFAULT_RECIPE_TYPES = [
  'Main Dish', 'Appetizer', 'Soup & Stew', 'Salad', 
  'Dessert', 'Breakfast', 'Beverage', 'Snack', 'Baking'
];

const DEFAULT_CATEGORIES = [
  'Pantry Staples', 'Produce', 'Meat & Seafood', 'Dairy & Eggs', 
  'Spices & Seasonings', 'Canned Goods', 'Grains & Pasta', 'Condiments & Sauces', 'Other'
];


const getCategoryName = (cat: any): string => {
  if (!cat) return 'Pantry Staples';
  if (typeof cat === 'string') {
    const trimmed = cat.trim();
    return trimmed === '[object Object]' || !trimmed ? 'Pantry Staples' : trimmed;
  }
  if (typeof cat === 'object') {
    return (cat.name || cat.label || cat.title || cat.slug || cat.id || 'Pantry Staples').trim();
  }
  return String(cat).trim();
};

const getRecipeTypeName = (type: any): string => {
  if (!type) return 'Main Dish';
  if (typeof type === 'string') {
    const trimmed = type.trim();
    return trimmed === '[object Object]' || !trimmed ? 'Main Dish' : trimmed;
  }
  if (typeof type === 'object') {
    return (type.name || type.label || type.title || type.slug || type.id || 'Main Dish').trim();
  }
  return String(type).trim();
};

export default function ManualRecipePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'ingredients' | 'steps'>('info');

  const remoteRecipeTypes = useRecipeTypes?.() || [];
  const remoteCategories = useIngredientCategories?.() || [];

  const recipeTypes = remoteRecipeTypes.length > 0 ? remoteRecipeTypes : DEFAULT_RECIPE_TYPES;
  const ingredientCategories = remoteCategories.length > 0 ? remoteCategories : DEFAULT_CATEGORIES;

  const [form, setForm] = useState({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    servings: 2,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    calories: 450,
    proteinGrams: 25,
    carbsGrams: 40,
    fatGrams: 15,
    imageUrl: '',
    ingredients: [
      { amount: '10', unit: 'g', item: 'Palm sugar, chopped', category: 'Pantry Staples' },
      { amount: '2', unit: 'tbsp', item: 'Fish sauce', category: 'Condiments & Sauces' }
    ] as IngredientItem[],
    instructions: [
      'Heat a wok or large pan over medium-high heat with a drizzle of oil.',
      'Add ingredients and stir thoroughly until cooked to perfection.'
    ] as string[]
  });

  const [saving, setSaving] = useState(false);
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3800);
  };

  useEffect(() => {
    document.title = `${t('createRecipe', 'Create Recipe')} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);

    const handleSync = () => {
      const u = getCurrentUser();
      if (u) setCurrentUser(u);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_theme_mode_changed', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [router, t]);

  useEffect(() => {
    if (recipeTypes && recipeTypes.length > 0 && !recipeTypes.map(getRecipeTypeName).includes(form.recipeType)) {
      setForm(prev => ({ ...prev, recipeType: getRecipeTypeName(recipeTypes[0]) }));
    }
  }, [recipeTypes, form.recipeType]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/recipes/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success && data.url) {
        setForm(prev => ({ ...prev, imageUrl: data.url }));
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } catch (_) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    if (type === 'ingredients') {
      const list = [...form.ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setForm({ ...form, ingredients: list });
      setDraggedIndex(index);
    } else {
      const list = [...form.instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setForm({ ...form, instructions: list });
      setDraggedIndex(index);
    }
  };

  const handleDrop = () => {
    setDraggedIndex(null);
  };

  // Touch-Friendly Accessible Move Handlers
  const moveIngredient = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= form.ingredients.length) return;
    const list = [...form.ingredients];
    const item = list[idx];
    list.splice(idx, 1);
    list.splice(targetIdx, 0, item);
    setForm({ ...form, ingredients: list });
  };

  const moveStep = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= form.instructions.length) return;
    const list = [...form.instructions];
    const item = list[idx];
    list.splice(idx, 1);
    list.splice(targetIdx, 0, item);
    setForm({ ...form, instructions: list });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast(t('enterRecipeTitleAlert', 'Please enter a recipe title before saving.'), 'error');
      setActiveTab('info');
      return;
    }

    const validIngredients = form.ingredients.filter(ing => ing.item && ing.item.trim().length > 0);
    if (validIngredients.length === 0) {
      showToast(t('atLeastOneIngredientAlert', 'Please add at least one ingredient item.'), 'error');
      setActiveTab('ingredients');
      return;
    }

    const validInstructions = form.instructions.filter(i => i && i.trim().length > 0);
    if (validInstructions.length === 0) {
      showToast(t('atLeastOneStepAlert', 'Please describe at least one cooking instruction step.'), 'error');
      setActiveTab('steps');
      return;
    }

    if (!currentUser) return;
    setSaving(true);

    try {
      const recipeId = 'manual_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newRecipe = {
        id: recipeId,
        userId: currentUser.id || 'usr_admin_1',
        createdBy: currentUser.email || 'admin@zecratary.com',
        creatorName: currentUser.name || 'Chef',
        title: form.title.trim(),
        name: form.title.trim(),
        description: form.description.trim() || 'Handmade recipe created in manual mode',
        recipeType: form.recipeType,
        category: form.recipeType,
        tags: [form.recipeType, 'Manual'],
        servings: Number(form.servings) || 2,
        prepTimeMinutes: Number(form.prepTimeMinutes) || 15,
        cookTimeMinutes: Number(form.cookTimeMinutes) || 30,
        calories: Number(form.calories) || 450,
        proteinGrams: Number(form.proteinGrams) || 25,
        carbsGrams: Number(form.carbsGrams) || 40,
        fatGrams: Number(form.fatGrams) || 15,
        imageUrl: form.imageUrl || '/uploads/recipes/default.jpg',
        image: form.imageUrl || '/uploads/recipes/default.jpg',
        ingredients: validIngredients.map((ing, idx) => ({
          id: `ing_${Date.now()}_${idx}`,
          amount: ing.amount || '1',
          unit: ing.unit || '',
          name: ing.item.trim(),
          item: ing.item.trim(),
          category: ing.category || 'Pantry Staples'
        })),
        instructions: validInstructions,
        steps: validInstructions,
        isFavorite: false,
        isCooked: false,
        rating: 5,
        note: '',
        sourceUrl: '',
        createdAt: new Date().toISOString()
      };

      // 1. Persist to PostgreSQL via /api/saved-recipes
      try {
        await fetch('/api/saved-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecipe)
        });
      } catch (_) {}

      // 2. Persist to /api/recipes for backend catalog sync
      try {
        await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecipe)
        });
      } catch (_) {}

      // 3. Update local storage cache for immediate offline hydration
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('zecratary_saved_recipes') || '[]';
          const existing = JSON.parse(raw);
          localStorage.setItem('zecratary_saved_recipes', JSON.stringify([newRecipe, ...existing]));
        } catch (_) {}

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('zecratary_recipes_updated'));
        window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      }

      showToast(t('recipeCreatedSuccessToast', 'Recipe saved successfully to your culinary library!'), 'success');
      setTimeout(() => {
        router.push('/saved');
      }, 700);

    } catch (err: any) {
      showToast(err.message || 'Failed to save manual recipe', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="w-full min-h-screen pb-24 px-2 sm:px-6 pt-4 font-sans transition-colors duration-200"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
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

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div 
          className="flex items-center justify-between border-b pb-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <Link 
              href="/saved" 
              className="p-2.5 rounded-xl transition shadow-xs border cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
              title={t('backBtn', '← Back')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-primary)' }}>
                {t('createRecipe', 'Create Recipe')}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('createRecipeSubtitle', 'Fill in details, ingredients, and preparation steps')}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher Navigation */}
        <div 
          className="flex p-1.5 rounded-2xl border shadow-xs"
          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
        >
          {[
            { id: 'info', label: t('basicInfoTab', 'Basic Info') },
            { id: 'ingredients', label: t('ingredientsTab', 'Ingredients') },
            { id: 'steps', label: t('stepsTab', 'Preparation Steps') }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer border"
                style={isActive ? {
                  backgroundColor: 'var(--color-card)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-border)'
                } : {
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ACCESSIBLE FORM-FREE DIV CONTAINER (Constraint 9: Autofill Guardrail) */}
        <div 
          role="region"
          data-lpignore="true"
          className="space-y-6"
        >
          {/* TAB 1: BASIC INFO & NUTRITION */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Photo Upload & Preview */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                  {t('photoLabel', 'Recipe Photo')}
                </label>
                
                <div 
                  className="border-2 border-dashed rounded-2xl min-h-[12rem] flex flex-col items-center justify-center relative overflow-hidden group shadow-xs p-4"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  {form.imageUrl ? (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden group">
                      <img src={form.imageUrl} alt="Recipe Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-red-600 transition cursor-pointer shadow-md flex items-center gap-1 text-[11px] font-bold"
                        title={t('removeImage', 'Remove Photo')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t('removeImage', 'Remove Photo')}</span>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer text-center space-y-2 p-6 w-full">
                      <ImagePlus className="h-8 w-8 mx-auto transition text-slate-400 group-hover:text-[var(--color-primary)]" />
                      <span className="text-xs font-bold block" style={{ color: 'var(--color-text)' }}>
                        {t('addAPhoto', 'Upload or drag a photo')}
                      </span>
                      <span className="text-[11px] block" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('uploadsHint', 'Supported formats: JPG, PNG, WEBP (Max 5MB)')}
                      </span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}

                  <div className="w-full mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px] font-bold shrink-0 opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('imageUrlOrUpload', 'Or enter Image URL')}:
                    </span>
                    <input
                      type="url"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder={t('imageUrlPlaceholder', 'https://example.com/recipe-photo.jpg')}
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      className="flex-1 border rounded-xl p-2 text-xs outline-none font-medium"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Title, Description & Metadata */}
              <div 
                className="border rounded-2xl p-6 space-y-4 text-xs shadow-xs"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('recipeTitleRequired', 'Recipe Title *')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    placeholder={t('recipeTitlePlaceholder', 'e.g. Authentic Pad Thai')}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('description', 'Description & Story')}
                  </label>
                  <textarea
                    rows={3}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    placeholder={t('descriptionPlaceholder', 'Describe the taste, occasion, or special culinary techniques...')}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded-xl p-3 text-sm outline-none resize-y transition font-medium"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                      {t('recipeTypeLabel', 'Recipe Category / Type')}
                    </label>
                    <select
                      value={form.recipeType}
                      onChange={(e) => setForm({ ...form, recipeType: e.target.value })}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      {recipeTypes.map((type: any, idx: number) => {
                        const typeName = getRecipeTypeName(type);
                        return (
                          <option key={`manual_type_${typeName}_${idx}`} value={typeName} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                            {typeName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                      {t('servingsLabel', 'Servings')}
                    </label>
                    <input
                      type="number"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      min="1"
                      value={form.servings}
                      onChange={(e) => setForm({ ...form, servings: parseInt(e.target.value) || 1 })}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                      {t('prepTimeMinsLabel', 'Prep Time (mins)')}
                    </label>
                    <input
                      type="number"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      min="0"
                      value={form.prepTimeMinutes}
                      onChange={(e) => setForm({ ...form, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                      {t('cookTimeMinsLabel', 'Cook Time (mins)')}
                    </label>
                    <input
                      type="number"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      min="0"
                      value={form.cookTimeMinutes}
                      onChange={(e) => setForm({ ...form, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                {/* NUTRITIONAL INFORMATION SECTION (Restored & Localized) */}
                <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                  <label className="block font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                    {t('nutritionHeading', 'Nutritional Information (Per Serving)')}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <span className="block font-semibold mb-1 opacity-80">{t('caloriesLabel', 'Calories (kcal)')}</span>
                      <input
                        type="number"
                        min="0"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        value={form.calories}
                        onChange={(e) => setForm({ ...form, calories: parseInt(e.target.value) || 0 })}
                        className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>
                    <div>
                      <span className="block font-semibold mb-1 opacity-80">{t('proteinLabel', 'Protein (g)')}</span>
                      <input
                        type="number"
                        min="0"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        value={form.proteinGrams}
                        onChange={(e) => setForm({ ...form, proteinGrams: parseInt(e.target.value) || 0 })}
                        className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>
                    <div>
                      <span className="block font-semibold mb-1 opacity-80">{t('carbsLabel', 'Carbohydrates (g)')}</span>
                      <input
                        type="number"
                        min="0"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        value={form.carbsGrams}
                        onChange={(e) => setForm({ ...form, carbsGrams: parseInt(e.target.value) || 0 })}
                        className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>
                    <div>
                      <span className="block font-semibold mb-1 opacity-80">{t('fatLabel', 'Fat (g)')}</span>
                      <input
                        type="number"
                        min="0"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        value={form.fatGrams}
                        onChange={(e) => setForm({ ...form, fatGrams: parseInt(e.target.value) || 0 })}
                        className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('ingredients')}
                  className="text-white font-bold px-6 py-3 rounded-xl text-xs transition shadow-md cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('nextIngredientsBtn', 'Next: Ingredients →')}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INGREDIENTS */}
          {activeTab === 'ingredients' && (
            <div 
              className="border rounded-2xl p-6 space-y-4 animate-in fade-in shadow-xs"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                  {t('ingredientsHeading', 'Ingredients & Quantities')}
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                    className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                    style={isReorderingIngredients ? {
                      backgroundColor: 'var(--color-emerald)',
                      borderColor: 'var(--color-emerald)',
                      color: '#ffffff'
                    } : {
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {isReorderingIngredients ? t('done', 'Done Reordering') : t('reorder', 'Reorder Mode')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ 
                      ...form, 
                      ingredients: [...form.ingredients, { amount: '1', unit: 'unit', item: '', category: getCategoryName(ingredientCategories[0]) || 'Pantry Staples' }] 
                    })}
                    className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-xs hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> {t('addIngredient', 'Add Ingredient')}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-xs max-h-[460px] overflow-y-auto pr-1">
                {form.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    draggable={isReorderingIngredients}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                    onDrop={handleDrop}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl border transition shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: isReorderingIngredients ? 'var(--color-emerald)' : 'var(--color-border)',
                      cursor: isReorderingIngredients ? 'grab' : 'default'
                    }}
                  >
                    <input
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder={t('amt', 'Amount')}
                      value={ing.amount}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].amount = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="w-16 border rounded-lg p-2 text-center font-bold outline-none"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <input
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder={t('unit', 'Unit')}
                      value={ing.unit}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].unit = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="w-20 border rounded-lg p-2 text-center outline-none"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <input
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      spellCheck="false"
                      placeholder={t('ingredientNamePlaceholder', 'Ingredient name (e.g. Garlic, minced)...')}
                      value={ing.item}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].item = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="flex-1 min-w-[140px] bg-transparent border-none outline-none px-2 font-medium"
                      style={{ color: 'var(--color-text)' }}
                    />
                    <select
                      value={ing.category}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].category = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="w-36 border rounded-lg p-2 text-[11px] outline-none cursor-pointer"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      {ingredientCategories.map((cat: any, idx: number) => {
                        const catName = getCategoryName(cat);
                        return (
                          <option key={`manual_cat_${catName}_${idx}`} value={catName} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                            {catName}
                          </option>
                        );
                      })}
                    </select>

                    {/* Touch Reorder Controls & Drag Handle */}
                    {isReorderingIngredients ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveIngredient(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
                          style={{ borderColor: 'var(--color-border)' }}
                          title={t('moveUp', 'Move Up')}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveIngredient(idx, 'down')}
                          disabled={idx === form.ingredients.length - 1}
                          className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
                          style={{ borderColor: 'var(--color-border)' }}
                          title={t('moveDown', 'Move Down')}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <div className="p-1.5 text-emerald-400 cursor-grab">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== idx) })}
                        className="p-2 text-red-400 hover:text-red-500 transition cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div 
                className="flex justify-between pt-3 border-t"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className="border font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {t('backBtn', '← Back')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('steps')}
                  className="text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('nextStepsBtn', 'Next: Preparation Steps →')}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: STEPS */}
          {activeTab === 'steps' && (
            <div 
              className="border rounded-2xl p-6 space-y-4 animate-in fade-in shadow-xs"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                  {t('stepByStepInstructions', 'Step-by-Step Cooking Instructions')}
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                    className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                    style={isReorderingSteps ? {
                      backgroundColor: 'var(--color-emerald)',
                      borderColor: 'var(--color-emerald)',
                      color: '#ffffff'
                    } : {
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {isReorderingSteps ? t('done', 'Done Reordering') : t('reorder', 'Reorder Mode')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, instructions: [...form.instructions, ''] })}
                    className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-xs hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> {t('addStep', 'Add Step')}
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-xs max-h-[460px] overflow-y-auto pr-1">
                {form.instructions.map((step, idx) => (
                  <div
                    key={idx}
                    draggable={isReorderingSteps}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                    onDrop={handleDrop}
                    className="flex items-start gap-3 p-3 rounded-xl border transition shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: isReorderingSteps ? 'var(--color-emerald)' : 'var(--color-border)'
                    }}
                  >
                    <span 
                      className="w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-1"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        color: 'var(--color-primary)',
                        borderColor: 'var(--color-primary)',
                        borderWidth: '1px'
                      }}
                    >
                      {idx + 1}
                    </span>
                    <textarea
                      rows={2}
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      spellCheck="false"
                      placeholder={(t('describeStepPlaceholder', 'Describe step {n} in detail...')).replace('{n}', String(idx + 1))}
                      value={step}
                      onChange={(e) => {
                        const list = [...form.instructions];
                        list[idx] = e.target.value;
                        setForm({ ...form, instructions: list });
                      }}
                      className="flex-1 bg-transparent border-none outline-none resize-y font-medium text-xs"
                      style={{ color: 'var(--color-text)' }}
                    />

                    {/* Touch Reorder Controls & Drag Handle */}
                    {isReorderingSteps ? (
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
                          style={{ borderColor: 'var(--color-border)' }}
                          title={t('moveUp', 'Move Up')}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 'down')}
                          disabled={idx === form.instructions.length - 1}
                          className="p-1.5 rounded-lg border disabled:opacity-30 cursor-pointer"
                          style={{ borderColor: 'var(--color-border)' }}
                          title={t('moveDown', 'Move Down')}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <div className="p-1.5 text-emerald-400 cursor-grab">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, instructions: form.instructions.filter((_, i) => i !== idx) })}
                        className="p-2 text-red-400 hover:text-red-500 transition h-fit cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div 
                className="flex justify-between pt-3 border-t"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('ingredients')}
                  className="border font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {t('backBtn', '← Back')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="text-white font-bold px-8 py-3 rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Save className="h-4 w-4" /> 
                  {saving ? t('savingRecipe', 'Saving to Database...') : t('saveRecipe', 'Save Recipe to Library')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
