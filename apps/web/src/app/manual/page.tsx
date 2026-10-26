// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  SquarePen, Plus, Trash2, Save, ArrowLeft, Image as ImageIcon,
  Upload, CheckCircle2, AlertCircle, HardDrive, Cloud, RefreshCw,
  ArrowUp, ArrowDown, GripVertical, Sparkles, ChefHat
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useRecipeTypes, useIngredientCategories } from '@/lib/recipe_types';
import { useTranslation } from '@/components/LanguageProvider';

interface IngredientItem {
  amount: string;
  unit: string;
  item: string;
  category: string;
}

const DEFAULT_RECIPE_TYPES = [
  'Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Appetizer', 
  'Side Dish', 'Dessert', 'Snacks', 'Beverages', 'Soup', 'Salad'
];

const DEFAULT_CATEGORIES = [
  'Pantry Staples', 'Produce', 'Meat & Seafood', 'Dairy & Eggs', 
  'Spices & Seasonings', 'Canned Goods', 'Grains & Pasta', 'Condiments & Sauces', 'Other'
];

export default function ManualRecipePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'ingredients' | 'steps'>('info');

  const remoteRecipeTypes = useRecipeTypes?.() || [];
  const remoteCategories = useIngredientCategories?.() || [];

  const recipeTypes = Array.isArray(remoteRecipeTypes) && remoteRecipeTypes.length > 0 
    ? remoteRecipeTypes 
    : DEFAULT_RECIPE_TYPES;
  const ingredientCategories = Array.isArray(remoteCategories) && remoteCategories.length > 0 
    ? remoteCategories 
    : DEFAULT_CATEGORIES;

  // Recipe Form State
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
      { amount: '2', unit: 'tbsp', item: 'Olive oil', category: 'Pantry Staples' },
      { amount: '3', unit: 'cloves', item: 'Garlic, minced', category: 'Produce' }
    ] as IngredientItem[],
    instructions: [
      'Heat olive oil in a skillet over medium heat.',
      'Sauté minced garlic until aromatic, then combine remaining ingredients.'
    ] as string[]
  });

  // Storage Engine Telemetry (Synced with /admin/storage)
  const [storageProvider, setStorageProvider] = useState<'local' | 'supabase'>('local');
  const [storagePath, setStoragePath] = useState<string>('/recipes/images/');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDownloadingRemote, setIsDownloadingRemote] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Sync Storage Engine with /admin/storage
  const fetchStorageSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/storage?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const s = data.storage || data.settings || data;
        const provider = s.provider || s.activeProvider || (s.supabase?.enabled ? 'supabase' : 'local');
        setStorageProvider(provider === 'supabase' ? 'supabase' : 'local');
        if (s.localPath) setStoragePath(s.localPath);
      }
    } catch (_) {
      try {
        const adminRes = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: 'no-store' });
        if (adminRes.ok) {
          const adm = await adminRes.json();
          const s = adm.storage || adm.settings?.storage || {};
          if (s.provider) setStorageProvider(s.provider);
        }
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    document.title = `${t('createRecipe', 'Create Recipe')} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);
    fetchStorageSettings();

    const handleSync = () => {
      const u = getCurrentUser();
      if (u) setCurrentUser(u);
      fetchStorageSettings();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('zecratary_storage_settings_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);
    window.addEventListener('zecratary_theme_mode_changed', handleSync);
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('zecratary_locale_changed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('zecratary_storage_settings_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
      window.removeEventListener('zecratary_theme_mode_changed', handleSync);
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('zecratary_locale_changed', handleSync);
    };
  }, [router, t, fetchStorageSettings]);

  useEffect(() => {
    if (recipeTypes.length > 0 && !recipeTypes.includes(form.recipeType)) {
      setForm(prev => ({ ...prev, recipeType: recipeTypes[0] }));
    }
  }, [recipeTypes, form.recipeType]);

  // Handle Drag & Drop Image Upload with Center Click Trigger
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(t('invalidImageFormat', 'Please select a valid image file (PNG, JPG, WEBP).'), 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('provider', storageProvider);

      const res = await fetch('/api/recipes/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && (data.url || data.localUrl || data.path)) {
        const finalUrl = data.url || data.localUrl || data.path;
        setForm(prev => ({ ...prev, imageUrl: finalUrl }));
        showToast(t('imageUploadSuccess', 'Cover image uploaded and synced with /admin/storage!'), 'success');
      } else {
        // Fallback to local DataURL preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
        showToast(t('imageUploadFailed', 'Image upload failed. Storing image preview locally.'), 'warning');
      }
    } catch (_) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Sync Remote Image with /admin/storage to prevent broken hotlinks
  const handleRemoteImageSync = async () => {
    const rawUrl = form.imageUrl.trim();
    if (!rawUrl || (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://'))) return;

    setIsDownloadingRemote(true);
    try {
      const res = await fetch('/api/recipes/save-remote-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: rawUrl })
      });
      const data = await res.json();
      if (res.ok && data.success && (data.localPath || data.localUrl)) {
        setForm(prev => ({ ...prev, imageUrl: data.localPath || data.localUrl }));
        showToast(t('imageUploadSuccess', 'Remote image downloaded and synced with /admin/storage!'), 'success');
      }
    } catch (_) {
      // Keep existing URL if remote fetch fails
    } finally {
      setIsDownloadingRemote(false);
    }
  };

  // Drag and Drop Reordering Handlers
  const handleItemDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleItemDragOver = (e: React.DragEvent, index: number, type: 'ingredients' | 'steps') => {
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

  const handleItemDrop = () => {
    setDraggedIndex(null);
  };

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
      const recipeId = 'manual_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const targetUserId = (currentUser.id || currentUser.email || 'usr_admin_1').trim();
      const createdBy = (currentUser.email || targetUserId).trim();
      const creatorName = (currentUser.name || 'Chef').trim();

      const newRecipe = {
        id: recipeId,
        userId: targetUserId,
        user_id: targetUserId,
        createdBy,
        created_by: createdBy,
        creatorName,
        creator_name: creatorName,
        ownership: 'personal',
        owner: creatorName,
        ownerId: targetUserId,
        ownerName: creatorName,
        ownerEmail: createdBy,
        visibility: 'public',
        isPublic: true,
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
        image_url: form.imageUrl || '/uploads/recipes/default.jpg',
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
        sourceUrl: '',
        storageProvider,
        createdAt: new Date().toISOString()
      };

      // 1. Persist to PostgreSQL via /api/saved-recipes & /api/recipes
      await Promise.allSettled([
        fetch('/api/saved-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecipe)
        }),
        fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecipe)
        })
      ]);

      // 2. Hydrate client localStorage for instant offline access
      const storageKeys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes'];
      storageKeys.forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          const currentList = raw ? JSON.parse(raw) : [];
          const filtered = Array.isArray(currentList) ? currentList.filter((r: any) => r.id !== newRecipe.id) : [];
          localStorage.setItem(key, JSON.stringify([newRecipe, ...filtered]));
        } catch (_) {}
      });

      // 3. Dispatch global synchronization events
      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      window.dispatchEvent(new Event('storage'));

      showToast(t('recipeCreatedSuccessToast', 'Recipe saved successfully to your culinary library!'), 'success');
      setTimeout(() => {
        router.push('/recipes');
      }, 750);
    } catch (err: any) {
      showToast(err.message || 'Failed to save manual recipe', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      id="zecratary-manual-canvas"
      role="region"
      aria-label={t('createRecipe', 'Create Recipe')}
      data-lpignore="true"
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 font-sans transition-colors duration-200"
      style={{ 
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        color: 'var(--color-text)' 
      }}
    >
      {/* Toast Banner */}
      {toastMessage && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: toastMessage.type === 'success' 
              ? 'var(--color-emerald)' 
              : toastMessage.type === 'warning' 
                ? '#f59e0b' 
                : '#ef4444',
            color: 'var(--color-text)'
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header with /admin/storage Engine Sync Telemetry */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <Link 
            href="/recipes" 
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
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <SquarePen className="h-6 w-6" /> {t('createRecipe', 'Create Recipe')}
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t('createRecipeSubtitle', 'Craft and customize dishes with ingredients, categories, and instructions')}
            </p>
          </div>
        </div>

        {/* /admin/storage Telemetry Pill */}
        <div className="flex items-center gap-2">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-xs"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
            title={`Active Storage Provider: ${storageProvider.toUpperCase()} (/admin/storage)`}
          >
            {storageProvider === 'supabase' ? (
              <Cloud className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <HardDrive className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            )}
            <span className="font-mono uppercase tracking-wider text-[10px]">
              {storageProvider === 'supabase' ? 'Supabase S3' : 'Local Disk'}
            </span>
            <span 
              className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase"
              style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-emerald)' }}
            >
              {t('storageSyncedBadge', 'Storage Synced')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Fluid Container */}
      <div 
        role="region"
        data-lpignore="true"
        className="w-full max-w-full rounded-3xl p-6 space-y-6 shadow-xl border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          boxSizing: 'border-box'
        }}
      >
        {/* Method Tab Bar */}
        <div 
          className="flex p-1.5 rounded-2xl border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)'
          }}
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
                className="flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                style={isActive ? {
                  backgroundColor: 'var(--color-card)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  borderWidth: '1px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                } : {
                  color: 'var(--color-text-secondary)'
                }}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Accessible Autofill-Safe Form Free Region */}
        <div role="region" data-lpignore="true" className="space-y-6">

          {/* TAB 1: BASIC INFO & RESTORED DRAG & DROP PHOTO UPLOAD */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Task 4: Restored Drag & Drop with Click Center Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                  {t('photoLabel', 'Recipe Photo')}
                </label>

                {form.imageUrl ? (
                  <div 
                    className="relative w-full h-56 rounded-2xl overflow-hidden border group shadow-md"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <img src={form.imageUrl} alt="Recipe Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-red-600 text-white transition cursor-pointer shadow-lg flex items-center gap-1.5 text-xs font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t('removeImage', 'Remove Photo')}</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition relative group"
                    style={{
                      borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: isDragging ? 'var(--color-card)' : 'var(--color-inner-dark)'
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => e.target.files?.[0] && processImageFile(e.target.files[0])}
                      className="hidden"
                    />
                    
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center mb-3 transition transform group-hover:scale-105"
                      style={{ backgroundColor: 'var(--color-card)' }}
                    >
                      <Upload 
                        className={`h-7 w-7 ${isUploadingImage ? 'animate-spin' : ''}`} 
                        style={{ color: 'var(--color-primary)' }} 
                      />
                    </div>

                    <p className="text-xs sm:text-sm font-semibold tracking-wide" style={{ color: 'var(--color-text)' }}>
                      <span style={{ color: 'var(--color-primary)' }} className="font-bold">
                        {t('clickToUploadCenter', 'Click center to browse or drag file here')}
                      </span>
                    </p>
                    <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('uploadOrDragHint', 'Supports PNG, JPG, WEBP (Max 10MB)')}
                    </p>
                  </div>
                )}

                {/* Alternate Image URL Input with /admin/storage Remote Sync */}
                <div 
                  className="w-full mt-3 p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
                >
                  <span className="text-[11px] font-bold shrink-0 opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
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
                    className="flex-1 bg-transparent border-none text-xs outline-none font-medium"
                    style={{ color: 'var(--color-text)' }}
                  />
                  {form.imageUrl.startsWith('http') && (
                    <button
                      type="button"
                      onClick={handleRemoteImageSync}
                      disabled={isDownloadingRemote}
                      className="px-3 py-1.5 rounded-lg text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                      title="Download image and store directly into /admin/storage engine"
                    >
                      <RefreshCw className={`h-3 w-3 ${isDownloadingRemote ? 'animate-spin' : ''}`} />
                      <span>{isDownloadingRemote ? t('downloadingRemote', 'Downloading...') : t('downloadRemoteBtn', 'Sync Image')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Title, Description & Metadata */}
              <div 
                className="border rounded-2xl p-6 space-y-4 text-xs shadow-xs"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
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
                    className="w-full border rounded-xl p-3.5 text-sm outline-none transition font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
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
                    className="w-full border rounded-xl p-3.5 text-xs outline-none resize-y transition font-medium"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
                      {t('recipeTypeLabel', 'Recipe Category / Type')}
                    </label>
                    <select
                      value={form.recipeType}
                      onChange={(e) => setForm({ ...form, recipeType: e.target.value })}
                      className="w-full border rounded-xl p-3 text-xs outline-none cursor-pointer font-bold"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      {recipeTypes.map((type) => {
                        const val = typeof type === 'string' ? type : type.name || type.label;
                        return (
                          <option key={val} value={val} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
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
                      className="w-full border rounded-xl p-3 text-xs outline-none font-bold"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
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
                      className="w-full border rounded-xl p-3 text-xs outline-none font-bold"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
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
                      className="w-full border rounded-xl p-3 text-xs outline-none font-bold"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                {/* Nutritional Information */}
                <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                  <label className="block font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                    {t('nutritionHeading', 'Nutritional Information (Per Serving)')}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  className="text-white font-bold px-8 py-3.5 rounded-xl text-xs transition shadow-md cursor-pointer hover:opacity-90"
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
                      ingredients: [...form.ingredients, { amount: '1', unit: 'unit', item: '', category: ingredientCategories[0] || 'Pantry Staples' }] 
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
                    onDragStart={() => handleItemDragStart(idx)}
                    onDragOver={(e) => handleItemDragOver(e, idx, 'ingredients')}
                    onDrop={handleItemDrop}
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
                      className="w-36 border rounded-lg p-2 text-[11px] outline-none cursor-pointer font-bold"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      {ingredientCategories.map((cat) => {
                        const val = typeof cat === 'string' ? cat : cat.name || cat.label;
                        return (
                          <option key={val} value={val} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                            {val}
                          </option>
                        );
                      })}
                    </select>

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

          {/* TAB 3: PREPARATION STEPS */}
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
                    onDragStart={() => handleItemDragStart(idx)}
                    onDragOver={(e) => handleItemDragOver(e, idx, 'steps')}
                    onDrop={handleItemDrop}
                    className="flex items-start gap-3 p-3 rounded-xl border transition shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: isReorderingSteps ? 'var(--color-emerald)' : 'var(--color-border)'
                    }}
                  >
                    <span 
                      className="w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-1 text-[11px]"
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
