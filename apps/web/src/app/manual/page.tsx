'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  SquarePen, Plus, Trash2, Save, ArrowLeft, Clock, 
  ChefHat, CheckCircle2, AlertCircle, Tag, Image as ImageIcon,
  Upload, RefreshCw, GripVertical, Check, Globe, Lock,
  ImagePlus, X, Utensils, Users, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';
import { getCurrentUser } from '@/lib/auth';
import { persistSavedRecipe } from '@/lib/recipeSync';
import { useRecipeTypes, useIngredientCategories } from '@/lib/recipe_types';

interface IngredientRow {
  name: string;
  amount: string;
  unit: string;
  category: string;
}

export default function ManualRecipePage() {
  const router = useRouter();
  const { t } = useTranslation();

  const recipeTypes = useRecipeTypes();
  const ingredientCategories = useIngredientCategories();

  // 3-Tab State: 'info' | 'ingredients' | 'steps'
  const [activeTab, setActiveTab] = useState<'info' | 'ingredients' | 'steps'>('info');

  const [form, setForm] = useState({
    title: '',
    description: '',
    recipeType: 'Main Dish',
    prepTime: '15',
    cookTime: '25',
    servings: '4',
    difficulty: 'Medium',
    cuisine: '',
    imageUrl: '',
    isPublic: false
  });

  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { name: '', amount: '1', unit: 'unit', category: 'Produce' }
  ]);

  const [instructions, setInstructions] = useState<string[]>(['']);
  
  // Drag and drop states
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Upload & processing states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applySavedTheme = useCallback(() => {
    try {
      window.dispatchEvent(new Event('zecratary_theme_updated'));
    } catch (_) {}
  }, []);

  useEffect(() => {
    document.title = `${t('manualRecipeTitle', 'Manual Recipe Creation')} - FoodiePrep`;
    applySavedTheme();

    window.addEventListener('zecratary_theme_mode_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_changed', applySavedTheme);
    window.addEventListener('zecratary_theme_updated', applySavedTheme);
    window.addEventListener('storage', applySavedTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_changed', applySavedTheme);
      window.removeEventListener('zecratary_theme_updated', applySavedTheme);
      window.removeEventListener('storage', applySavedTheme);
    };
  }, [applySavedTheme, t]);

  useEffect(() => {
    if (recipeTypes && recipeTypes.length > 0 && !recipeTypes.includes(form.recipeType)) {
      setForm(prev => ({ ...prev, recipeType: recipeTypes[0] }));
    }
  }, [recipeTypes, form.recipeType]);

  useEffect(() => {
    if (ingredientCategories && ingredientCategories.length > 0 && ingredients[0]?.category === 'Produce') {
      setIngredients(prev => prev.map(i => ({ ...i, category: i.category || ingredientCategories[0] })));
    }
  }, [ingredientCategories]);

  // Handle Image Upload using /api/recipes/upload (Synchronized with /admin/storage)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Direct upload to storage provider (Supabase S3 or /recipes/images)
      const res = await fetch('/api/recipes/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success && (data.url || data.imageUrl || data.localUrl)) {
        const finalUrl = data.url || data.imageUrl || data.localUrl;
        setForm(prev => ({ ...prev, imageUrl: finalUrl }));
      } else {
        // Fallback to Base64 data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.warn('Image upload notice:', err.message);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
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
      const list = [...ingredients];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setIngredients(list);
      setDraggedIndex(index);
    } else {
      const list = [...instructions];
      const item = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, item);
      setInstructions(list);
      setDraggedIndex(index);
    }
  };

  const handleDrop = () => {
    setDraggedIndex(null);
  };

  // Ingredient Helpers
  const handleAddIngredient = () => {
    setIngredients(prev => [
      ...prev, 
      { name: '', amount: '1', unit: 'unit', category: ingredientCategories[0] || 'Produce' }
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof IngredientRow, value: string) => {
    setIngredients(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Instruction Helpers
  const handleAddInstruction = () => {
    setInstructions(prev => [...prev, '']);
  };

  const handleRemoveInstruction = (index: number) => {
    if (instructions.length <= 1) return;
    setInstructions(prev => prev.filter((_, i) => i !== index));
  };

  const handleInstructionChange = (index: number, value: string) => {
    setInstructions(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  // Save Recipe to Universal Storage (/recipes JSON, /recipes/images or Supabase, PostgreSQL)
  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.title.trim()) {
      setErrorMsg(t('titleRequired', 'Recipe title is required.'));
      setActiveTab('info');
      return;
    }

    const validIngredients = ingredients.filter(i => i.name.trim().length > 0);
    if (validIngredients.length === 0) {
      setErrorMsg(t('ingredientRequired', 'Please add at least one valid ingredient.'));
      setActiveTab('ingredients');
      return;
    }

    const validInstructions = instructions.filter(s => s.trim().length > 0);
    if (validInstructions.length === 0) {
      setErrorMsg(t('instructionRequired', 'Please add at least one instruction step.'));
      setActiveTab('steps');
      return;
    }

    setLoading(true);

    const user = getCurrentUser();
    const targetUserId = (user?.id || user?.email || 'usr_admin_1').trim();
    const createdBy = (user?.email || targetUserId).trim();
    const creatorName = (user?.name || 'Chef').trim();
    const creatorEmail = (user?.email || '').trim();
    const recipeId = 'rcp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    let finalImageUrl = form.imageUrl.trim();
    if (!finalImageUrl) {
      finalImageUrl = '/recipes/images/default.jpg';
    }

    const recipePayload = {
      id: recipeId,
      ownership: {
        userId: targetUserId,
        createdBy,
        creatorName,
        creatorEmail
      },
      owner: {
        id: targetUserId,
        name: creatorName,
        email: creatorEmail
      },
      ownerId: targetUserId,
      ownerName: creatorName,
      ownerEmail: creatorEmail,
      userId: targetUserId,
      user_id: targetUserId,
      createdBy,
      created_by: createdBy,
      creatorName,
      creator_name: creatorName,
      creatorEmail,
      creator_email: creatorEmail,
      title: form.title.trim(),
      description: form.description.trim(),
      recipeType: form.recipeType,
      category: form.recipeType,
      prepTime: Number(form.prepTime) || 15,
      cookTime: Number(form.cookTime) || 25,
      prepTimeMinutes: Number(form.prepTime) || 15,
      cookTimeMinutes: Number(form.cookTime) || 25,
      totalTime: (Number(form.prepTime) || 15) + (Number(form.cookTime) || 25),
      servings: Number(form.servings) || 4,
      difficulty: form.difficulty,
      cuisine: form.cuisine.trim(),
      imageUrl: finalImageUrl,
      image: finalImageUrl,
      image_url: finalImageUrl,
      isPublic: Boolean(form.isPublic),
      is_public: Boolean(form.isPublic),
      isFavorite: false,
      isCooked: false,
      rating: 0,
      note: '',
      ingredients: validIngredients,
      instructions: validInstructions,
      directions: validInstructions,
      tags: [form.recipeType],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Post to API which persists to PostgreSQL/MySQL, saves /recipes/<id>.json, and syncs image
      const res = await fetch('/api/recipes/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([recipePayload])
      });

      if (!res.ok) {
        // Fallback to /api/recipes
        await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipePayload)
        });
      }

      // 2. Synchronize client storage for instantaneous UI response
      await persistSavedRecipe(targetUserId, recipePayload, {
        createdBy,
        creatorName
      }).catch(() => {});

      const storageKeys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes'];
      storageKeys.forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          const currentList = raw ? JSON.parse(raw) : [];
          const filtered = Array.isArray(currentList) ? currentList.filter((r: any) => r.id !== recipeId) : [];
          localStorage.setItem(key, JSON.stringify([recipePayload, ...filtered]));
        } catch (_) {}
      });

      window.dispatchEvent(new Event('zecratary_recipes_updated'));
      window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      window.dispatchEvent(new Event('storage'));

      setSuccessMsg(t('recipeSavedSuccess', 'Recipe created and saved to /recipes successfully! Redirecting...'));
      
      // Permanent redirect to canonical /recipes endpoint
      setTimeout(() => {
        router.push('/recipes');
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || t('errorSavingRecipe', 'Error saving recipe. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div 
      className="max-w-4xl mx-auto space-y-6 pb-24 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/recipes"
              className="p-2 rounded-xl border transition hover:opacity-85 cursor-pointer shadow-xs"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              title="Return to Recipes"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <SquarePen className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
              {t('manualRecipeTitle', 'Manual Recipe Creation')}
            </h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('manualRecipeSubtitle', 'Craft your own recipe with ingredients, categories, and instructions. Saved to /recipes directory.')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-60 self-start sm:self-auto hover:opacity-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{loading ? t('saving', 'Saving...') : t('saveRecipe', 'Save Recipe')}</span>
        </button>
      </div>

      {/* FEEDBACK NOTIFICATIONS */}
      {errorMsg && (
        <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-2xl text-xs text-red-300 font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in"
          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-emerald)', color: 'var(--color-emerald)' }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. THREE-TAB NAVIGATION WIZARD BAR */}
      <div 
        className="flex p-1.5 rounded-2xl border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-inner-dark)',
          borderColor: 'var(--color-border)'
        }}
      >
        {[
          { id: 'info', label: t('basicInfoTab', 'Basic Info'), icon: ChefHat },
          { id: 'ingredients', label: t('ingredientsTab', 'Ingredients'), icon: Tag },
          { id: 'steps', label: t('stepsTab', 'Steps'), icon: Clock },
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
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. ACCESSIBLE REGION CONTAINER (NO NATIVE FORM) */}
      <div 
        role="region" 
        aria-label="Manual recipe details" 
        data-lpignore="true"
        className="space-y-6"
      >
        {/* TAB 1: BASIC INFO & IMAGE UPLOAD */}
        {activeTab === 'info' && (
          <div 
            className="border rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl transition-colors duration-200 animate-in fade-in"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <ChefHat className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                <span>{t('generalInfo', 'General Information & Cover Image')}</span>
              </h2>

              {/* Public Marketplace Toggle */}
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: form.isPublic ? 'var(--color-emerald)' : 'var(--color-border)',
                  color: form.isPublic ? 'var(--color-emerald)' : 'var(--color-text-secondary)'
                }}
              >
                {form.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                <span>{form.isPublic ? 'Public (Marketplace)' : 'Private (Only You)'}</span>
              </button>
            </div>

            {/* COVER IMAGE UPLOAD / PREVIEW CARD */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                {t('recipeImageLabel', 'Recipe Cover Image (Upload or URL)')}
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <ImageIcon className="h-4 w-4 absolute left-3.5 top-3 text-orange-400 pointer-events-none" />
                  <input
                    type="url"
                    data-lpignore="true"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://example.com/dish.jpg (or upload below)"
                    className="w-full border rounded-xl pl-10 pr-3.5 py-2.5 text-xs outline-none font-medium transition"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="px-4 py-2.5 border rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-85 shrink-0"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <Upload className={`h-4 w-4 ${isUploadingImage ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
                  <span>{isUploadingImage ? t('uploading', 'Uploading...') : t('uploadImageBtn', 'Upload Image')}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </div>

              {form.imageUrl && (
                <div className="mt-3 relative w-full h-44 rounded-2xl overflow-hidden border shadow-inner group" style={{ borderColor: 'var(--color-border)' }}>
                  <img src={form.imageUrl} alt="Recipe Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-black/80 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1 cursor-pointer"
                    >
                      <ImagePlus className="h-3.5 w-3.5 text-orange-400" /> Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: '' })}
                      className="px-3 py-1.5 bg-red-600/90 text-white rounded-xl text-xs font-bold hover:bg-red-700 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* METADATA GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
              <div className="sm:col-span-2">
                <label className="block mb-1.5" style={{ color: 'var(--color-text)' }}>
                  {t('recipeTitle', 'Recipe Title *')}
                </label>
                <input
                  type="text"
                  required
                  data-lpignore="true"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Creamy Tuscan Garlic Chicken"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition font-medium"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block mb-1.5" style={{ color: 'var(--color-text)' }}>
                  {t('recipeDescription', 'Short Description')}
                </label>
                <textarea
                  rows={2}
                  data-lpignore="true"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief summary of the dish, taste profile, or background..."
                  className="w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none transition font-medium resize-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block mb-1.5" style={{ color: 'var(--color-text)' }}>
                  {t('recipeType', 'Recipe Type')}
                </label>
                <select
                  value={form.recipeType}
                  onChange={(e) => setForm({ ...form, recipeType: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {recipeTypes.map((type: any) => {
                    const val = typeof type === 'string' ? type : (type.id || type.name || type.value || '');
                    return <option key={val} value={val} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{val}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block mb-1.5" style={{ color: 'var(--color-text)' }}>
                  {t('cuisine', 'Cuisine (Optional)')}
                </label>
                <input
                  type="text"
                  data-lpignore="true"
                  value={form.cuisine}
                  onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
                  placeholder="e.g. Italian, Thai, Mediterranean"
                  className="w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none transition font-medium"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <label className="block mb-1 text-[11px]" style={{ color: 'var(--color-text)' }}>
                    {t('prepTime', 'Prep (min)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    data-lpignore="true"
                    value={form.prepTime}
                    onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-xs outline-none transition font-bold text-center"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[11px]" style={{ color: 'var(--color-text)' }}>
                    {t('cookTime', 'Cook (min)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    data-lpignore="true"
                    value={form.cookTime}
                    onChange={(e) => setForm({ ...form, cookTime: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-xs outline-none transition font-bold text-center"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[11px]" style={{ color: 'var(--color-text)' }}>
                    {t('servings', 'Servings')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    data-lpignore="true"
                    value={form.servings}
                    onChange={(e) => setForm({ ...form, servings: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-xs outline-none transition font-bold text-center"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('ingredients')}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span>{t('nextIngredients', 'Next: Ingredients')}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: INGREDIENTS */}
        {activeTab === 'ingredients' && (
          <div 
            className="border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl transition-colors duration-200 animate-in fade-in"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Tag className="h-4 w-4 text-orange-400" />
                  <span>{t('ingredients', 'Ingredients')}</span>
                </h2>
                <p className="text-xs pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Add scalable recipe items with standardized grocery departments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs"
                  style={isReorderingIngredients ? {
                    backgroundColor: 'var(--color-emerald)',
                    borderColor: 'var(--color-emerald)',
                    color: '#ffffff'
                  } : {
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {isReorderingIngredients ? t('done', 'Done') : t('reorder', 'Reorder')}
                </button>

                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-1 cursor-pointer shadow-xs hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('addIngredient', 'Add')}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {ingredients.map((ing, idx) => (
                <div 
                  key={idx}
                  draggable={isReorderingIngredients}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                  onDrop={handleDrop}
                  className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl border text-xs transition ${
                    isReorderingIngredients ? 'cursor-grab border-emerald-500/50' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: isReorderingIngredients ? 'var(--color-emerald)' : 'var(--color-border)'
                  }}
                >
                  <input
                    type="text"
                    data-lpignore="true"
                    placeholder="Amount"
                    value={ing.amount}
                    onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value)}
                    className="w-full sm:w-20 border rounded-lg px-2.5 py-1.5 text-center font-bold outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <input
                    type="text"
                    data-lpignore="true"
                    placeholder="Unit"
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                    className="w-full sm:w-24 border rounded-lg px-2.5 py-1.5 text-center outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  />
                  <input
                    type="text"
                    data-lpignore="true"
                    placeholder="Ingredient name (e.g. Baby Spinach)"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none px-2 font-medium"
                    style={{ color: 'var(--color-text)' }}
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => handleIngredientChange(idx, 'category', e.target.value)}
                    className="w-full sm:w-36 border rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {ingredientCategories.map((cat: any) => {
                      const val = typeof cat === 'string' ? cat : (cat.id || cat.name || cat.value || '');
                      return <option key={val} value={val} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{val}</option>;
                    })}
                  </select>

                  {isReorderingIngredients ? (
                    <div className="p-2 cursor-grab text-emerald-400 self-end sm:self-center">
                      <GripVertical className="h-4 w-4" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      disabled={ingredients.length <= 1}
                      className="p-2 text-red-400 hover:text-red-500 transition cursor-pointer disabled:opacity-30 self-end sm:self-center"
                      title="Remove Ingredient"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t flex justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className="px-5 py-2.5 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 cursor-pointer hover:opacity-85"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{t('backBtn', '← Back')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('steps')}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span>{t('nextSteps', 'Next: Steps')}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: STEP-BY-STEP INSTRUCTIONS */}
        {activeTab === 'steps' && (
          <div 
            className="border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl transition-colors duration-200 animate-in fade-in"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>{t('instructions', 'Step-by-Step Instructions')}</span>
                </h2>
                <p className="text-xs pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Detailed preparation, cooking, and plating directions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs"
                  style={isReorderingSteps ? {
                    backgroundColor: 'var(--color-emerald)',
                    borderColor: 'var(--color-emerald)',
                    color: '#ffffff'
                  } : {
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {isReorderingSteps ? t('done', 'Done') : t('reorder', 'Reorder')}
                </button>

                <button
                  type="button"
                  onClick={handleAddInstruction}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-1 cursor-pointer shadow-xs hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('addStep', 'Add Step')}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {instructions.map((step, idx) => (
                <div 
                  key={idx}
                  draggable={isReorderingSteps}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                  onDrop={handleDrop}
                  className={`flex items-start gap-3 p-3 rounded-2xl border text-xs transition ${
                    isReorderingSteps ? 'cursor-grab border-emerald-500/50' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: isReorderingSteps ? 'var(--color-emerald)' : 'var(--color-border)'
                  }}
                >
                  <span 
                    className="w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-1 border"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      color: 'var(--color-primary)',
                      borderColor: 'var(--color-primary)'
                    }}
                  >
                    {idx + 1}
                  </span>

                  <textarea
                    rows={2}
                    data-lpignore="true"
                    value={step}
                    onChange={(e) => handleInstructionChange(idx, e.target.value)}
                    placeholder={`Describe step ${idx + 1}...`}
                    className="flex-1 bg-transparent border-none outline-none resize-y font-medium text-xs leading-relaxed"
                    style={{ color: 'var(--color-text)' }}
                  />

                  {isReorderingSteps ? (
                    <div className="p-2 cursor-grab text-emerald-400 mt-1">
                      <GripVertical className="h-4 w-4" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruction(idx)}
                      disabled={instructions.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition cursor-pointer disabled:opacity-30 mt-1"
                      title="Remove Step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t flex justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('ingredients')}
                className="px-5 py-2.5 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 cursor-pointer hover:opacity-85"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{t('backBtn', '← Back')}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-60 hover:opacity-95"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{loading ? t('saving', 'Saving...') : t('saveRecipe', 'Save Recipe')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
