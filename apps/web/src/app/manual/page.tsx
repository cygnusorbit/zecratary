// Generated / Updated by AI Collaborator
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Trash2, Save, ArrowLeft, ImagePlus, GripVertical 
} from 'lucide-react';
import { getCurrentUser, User, initAuthStorage } from '@/lib/auth';
import { useRecipeTypes } from '@/lib/recipe-types';
import { useIngredientCategories } from '@/lib/categories';
import { useTranslation } from '@/components/LanguageProvider';

export default function ManualRecipePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'ingredients' | 'steps'>('info');
  const [isDayMode, setIsDayMode] = useState<boolean>(false);
  
  const recipeTypes = useRecipeTypes();
  const ingredientCategories = useIngredientCategories();

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
      { amount: '10', unit: 'g', item: 'palm sugar, chopped', category: 'Pantry Staples' }
    ],
    instructions: [
      'Add ingredients to a pan and cook over medium heat.'
    ]
  });

  const [saving, setSaving] = useState(false);
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isReorderingSteps, setIsReorderingSteps] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const applySavedTheme = useCallback(() => {
    try {
      const mode = typeof window !== 'undefined' ? localStorage.getItem('zecratary_theme_mode') : null;
      const isDay = mode === 'light';
      setIsDayMode(isDay);

      const stored = localStorage.getItem('zecratary_theme_colors') || localStorage.getItem('zecratary_theme_config');
      const c = stored ? JSON.parse(stored) : {};
      const root = document.documentElement;

      if (c.primary || c.primaryColor) root.style.setProperty('--color-primary', c.primary || c.primaryColor);
      if (c.primaryHover) root.style.setProperty('--color-primary-hover', c.primaryHover);
      if (c.accentEmerald || c.accentColor) root.style.setProperty('--color-emerald', c.accentEmerald || c.accentColor);

      if (isDay) {
        root.style.setProperty('--color-bg', '#f8fafc');
        root.style.setProperty('--color-bg-dark', '#f8fafc');
        root.style.setProperty('--color-card', '#ffffff');
        root.style.setProperty('--color-card-dark', '#ffffff');
        root.style.setProperty('--color-inner', '#f1f5f9');
        root.style.setProperty('--color-inner-dark', '#f1f5f9');
        root.style.setProperty('--color-border', '#e2e8f0');
        root.style.setProperty('--color-text', '#0f172a');
        root.style.setProperty('--color-text-secondary', '#64748b');

        root.classList.remove('dark');
        root.classList.add('light');

        if (typeof document !== 'undefined' && document.body) { // preserved by global theme#f8fafc';
          document.body.style.color = '#0f172a';
        }
      } else {
        const bg = c.backgroundDark || c.backgroundColor || '#070b13';
        const card = c.cardDark || c.cardBackground || '#111726';
        const inner = c.innerDark || '#070b13';
        const border = c.borderColor || c.cardBorder || '#1e293b';

        root.style.setProperty('--color-bg', bg);
        root.style.setProperty('--color-bg-dark', bg);
        root.style.setProperty('--color-card', card);
        root.style.setProperty('--color-card-dark', card);
        root.style.setProperty('--color-inner', inner);
        root.style.setProperty('--color-inner-dark', inner);
        root.style.setProperty('--color-border', border);
        root.style.setProperty('--color-text', '#ffffff');
        root.style.setProperty('--color-text-secondary', '#94a3b8');

        root.classList.remove('light');
        root.classList.add('dark');

        if (typeof document !== 'undefined' && document.body) { // preserved by global theme
          document.body.style.color = '';
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    document.title = `${t('createRecipe') || 'Create Recipe'} - Zecratary`;
    initAuthStorage();
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);

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
      if (typeof document !== 'undefined' && document.body) { // preserved by global theme
        document.body.style.color = '';
      }
    };
  }, [router, t, applySavedTheme]);

  useEffect(() => {
    if (recipeTypes && recipeTypes.length > 0 && !recipeTypes.includes(form.recipeType)) {
      setForm(prev => ({ ...prev, recipeType: recipeTypes[0] }));
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
    } catch (err) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert(t('enterRecipeTitleAlert') || 'Please enter a recipe title.');
      setActiveTab('info');
      return;
    }
    if (!currentUser) return;
    setSaving(true);

    try {
      const newRecipe = {
        id: 'manual_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        userId: currentUser.id,
        createdBy: currentUser.email,
        creatorName: currentUser.name,
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
        ingredients: form.ingredients.map((ing, idx) => ({
          id: `ing_${Date.now()}_${idx}`,
          amount: ing.amount || '1',
          unit: ing.unit || '',
          name: ing.item || 'Ingredient',
          item: ing.item || 'Ingredient',
          category: ing.category || 'Pantry Staples'
        })),
        instructions: form.instructions.filter(i => i.trim().length > 0),
        steps: form.instructions.filter(i => i.trim().length > 0),
        isFavorite: false,
        isCooked: false,
        rating: 5,
        note: '',
        sourceUrl: '',
        createdAt: new Date().toISOString()
      };

      await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipe)
      }).catch(() => {});

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('zecratary_recipes_updated'));
        window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
      }

      router.push('/saved');
    } catch (err) {
      console.error('Failed to save manual recipe:', err);
    } finally {
      setSaving(false);
    }
  };

  const cPageBg = isDayMode ? '#f8fafc' : 'var(--color-bg, #070b13)';
  const cCardBg = isDayMode ? '#ffffff' : 'var(--color-card, #111726)';
  const cInnerBg = isDayMode ? '#f1f5f9' : 'var(--color-inner, #070b13)';
  const cInputBg = isDayMode ? '#f8fafc' : 'var(--color-inner, #070b13)';
  const cBorder = isDayMode ? '#cbd5e1' : 'var(--color-border, #1e293b)';
  const cText = isDayMode ? '#0f172a' : 'var(--color-text, #ffffff)';
  const cSubText = isDayMode ? '#64748b' : 'var(--color-text-secondary, #94a3b8)';
  const cLabel = isDayMode ? '#334155' : '#cbd5e1';

  return (
    <div 
      className="w-full min-h-screen pb-24 px-2 sm:px-6 pt-4 font-sans transition-colors duration-200"
      style={{ backgroundColor: cPageBg, color: cText }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div 
          className="flex items-center justify-between border-b pb-4"
          style={{ borderColor: cBorder }}
        >
          <div className="flex items-center gap-3">
            <Link 
              href="/saved" 
              className="p-2.5 rounded-xl transition shadow-xs border"
              style={{
                backgroundColor: cCardBg,
                borderColor: cBorder,
                color: cSubText
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary,#E05638)]">
                {t('createRecipe') || 'Create Recipe'}
              </h1>
              <p className="text-xs" style={{ color: cSubText }}>
                {t('createRecipeSubtitle') || 'Fill in details, ingredients, and preparation steps'}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="flex p-1.5 rounded-2xl border shadow-xs"
          style={{ backgroundColor: cInnerBg, borderColor: cBorder }}
        >
          {[
            { id: 'info', label: t('basicInfoTab') || 'Basic Info' },
            { id: 'ingredients', label: t('ingredientsTab') || 'Ingredients' },
            { id: 'steps', label: t('stepsTab') || 'Steps' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer border"
                style={isActive ? {
                  backgroundColor: cCardBg,
                  color: 'var(--color-primary, #E05638)',
                  borderColor: cBorder
                } : {
                  backgroundColor: 'transparent',
                  borderColor: 'transparent',
                  color: cSubText
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-primary,#E05638)] uppercase tracking-wider">
                  {t('photoLabel') || 'Photo'}
                </label>
                <label 
                  className="border-2 border-dashed rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group shadow-xs"
                  style={{ backgroundColor: cCardBg, borderColor: cBorder }}
                >
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="Recipe Preview" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="text-center space-y-2">
                      <ImagePlus className="h-8 w-8 mx-auto transition text-slate-400 group-hover:text-[var(--color-primary,#E05638)]" />
                      <span className="text-xs font-bold block" style={{ color: cText }}>{t('addAPhoto') || 'Add a photo'}</span>
                      <span className="text-[11px]" style={{ color: cSubText }}>{t('uploadsHint') || 'Uploads save to local drive /uploads/recipes/'}</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div 
                className="border rounded-2xl p-6 space-y-4 text-xs shadow-xs"
                style={{ backgroundColor: cCardBg, borderColor: cBorder }}
              >
                <div>
                  <label className="block font-semibold mb-1" style={{ color: cLabel }}>
                    {t('recipeTitleRequired') || 'Recipe Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('recipeTitlePlaceholder') || 'e.g. Authentic Pad Thai'}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded-xl p-3 text-sm outline-none transition font-bold"
                    style={{
                      backgroundColor: cInputBg,
                      borderColor: cBorder,
                      color: cText
                    }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: cLabel }}>
                    {t('description') || 'Description'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={t('descriptionPlaceholder') || 'Short summary of the dish...'}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded-xl p-3 text-sm outline-none resize-y transition"
                    style={{
                      backgroundColor: cInputBg,
                      borderColor: cBorder,
                      color: cText
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: cLabel }}>{t('recipeTypeLabel') || 'Recipe Type'}</label>
                    <select
                      value={form.recipeType}
                      onChange={(e) => setForm({ ...form, recipeType: e.target.value })}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer font-bold"
                      style={{
                        backgroundColor: cInputBg,
                        borderColor: cBorder,
                        color: cText
                      }}
                    >
                      {recipeTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1" style={{ color: cLabel }}>{t('servingsLabel') || 'Servings'}</label>
                    <input
                      type="number"
                      value={form.servings}
                      onChange={(e) => setForm({ ...form, servings: parseInt(e.target.value) || 1 })}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                      style={{
                        backgroundColor: cInputBg,
                        borderColor: cBorder,
                        color: cText
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1" style={{ color: cLabel }}>{t('prepTimeMinsLabel') || 'Prep Time (m)'}</label>
                    <input
                      type="number"
                      value={form.prepTimeMinutes}
                      onChange={(e) => setForm({ ...form, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                      style={{
                        backgroundColor: cInputBg,
                        borderColor: cBorder,
                        color: cText
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1" style={{ color: cLabel }}>{t('cookTimeMinsLabel') || 'Cook Time (m)'}</label>
                    <input
                      type="number"
                      value={form.cookTimeMinutes}
                      onChange={(e) => setForm({ ...form, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none font-bold"
                      style={{
                        backgroundColor: cInputBg,
                        borderColor: cBorder,
                        color: cText
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('ingredients')}
                  className="text-white font-bold px-6 py-3 rounded-xl text-xs transition shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                >
                  {t('nextStepsBtn') || 'Next: Ingredients →'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ingredients' && (
            <div 
              className="border rounded-2xl p-6 space-y-4 animate-in fade-in shadow-xs"
              style={{ backgroundColor: cCardBg, borderColor: cBorder }}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-primary,#E05638)]">
                  {t('ingredientsHeading') || 'Ingredients'}
                </h2>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsReorderingIngredients(!isReorderingIngredients)}
                    className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                    style={isReorderingIngredients ? {
                      backgroundColor: 'var(--color-emerald, #10b981)',
                      borderColor: 'var(--color-emerald, #10b981)',
                      color: '#ffffff'
                    } : {
                      backgroundColor: cInputBg,
                      borderColor: cBorder,
                      color: cSubText
                    }}
                  >
                    {isReorderingIngredients ? (t('done') || 'Done') : (t('reorder') || 'Reorder')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { amount: '', unit: 'g', item: '', category: ingredientCategories[0] || 'Pantry Staples' }] })}
                    className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-xs"
                    style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> {t('addIngredient') || 'Add Ingredient'}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-xs max-h-[400px] overflow-y-auto pr-1">
                {form.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    draggable={isReorderingIngredients}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx, 'ingredients')}
                    onDrop={handleDrop}
                    className="flex items-center gap-2 p-2.5 rounded-xl border transition"
                    style={{
                      backgroundColor: cInputBg,
                      borderColor: isReorderingIngredients ? 'var(--color-emerald, #10b981)' : cBorder,
                      cursor: isReorderingIngredients ? 'grab' : 'default'
                    }}
                  >
                    <input
                      type="text"
                      placeholder={t('amt') || 'Amt'}
                      value={ing.amount}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].amount = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="w-16 border rounded-lg p-2 text-center font-bold outline-none"
                      style={{
                        backgroundColor: cCardBg,
                        borderColor: cBorder,
                        color: cText
                      }}
                    />
                    <input
                      type="text"
                      placeholder={t('unit') || 'Unit'}
                      value={ing.unit}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].unit = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="w-20 border rounded-lg p-2 text-center outline-none"
                      style={{
                        backgroundColor: cCardBg,
                        borderColor: cBorder,
                        color: cText
                      }}
                    />
                    <input
                      type="text"
                      placeholder={t('ingredientNamePlaceholder') || 'Ingredient name...'}
                      value={ing.item}
                      onChange={(e) => {
                        const list = [...form.ingredients];
                        list[idx].item = e.target.value;
                        setForm({ ...form, ingredients: list });
                      }}
                      className="flex-1 bg-transparent border-none outline-none px-2 font-medium"
                      style={{ color: cText }}
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
                        backgroundColor: cCardBg,
                        borderColor: cBorder,
                        color: cText
                      }}
                    >
                      {ingredientCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    {isReorderingIngredients ? (
                      <div className="p-2 text-[var(--color-emerald,#10b981)] cursor-grab">
                        <GripVertical className="h-4 w-4" />
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
                style={{ borderColor: cBorder }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className="border font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer"
                  style={{
                    backgroundColor: cInputBg,
                    borderColor: cBorder,
                    color: cLabel
                  }}
                >
                  {t('backBtn') || '← Back'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('steps')}
                  className="text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                >
                  {t('nextStepsBtn') || 'Next: Steps →'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'steps' && (
            <div 
              className="border rounded-2xl p-6 space-y-4 animate-in fade-in shadow-xs"
              style={{ backgroundColor: cCardBg, borderColor: cBorder }}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-primary,#E05638)]">
                  {t('stepByStepInstructions') || 'Step-by-Step Instructions'}
                </h2>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsReorderingSteps(!isReorderingSteps)}
                    className="font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer"
                    style={isReorderingSteps ? {
                      backgroundColor: 'var(--color-emerald, #10b981)',
                      borderColor: 'var(--color-emerald, #10b981)',
                      color: '#ffffff'
                    } : {
                      backgroundColor: cInputBg,
                      borderColor: cBorder,
                      color: cSubText
                    }}
                  >
                    {isReorderingSteps ? (t('done') || 'Done') : (t('reorder') || 'Reorder')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, instructions: [...form.instructions, ''] })}
                    className="text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-xs"
                    style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> {t('addStep') || 'Add Step'}
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-xs max-h-[400px] overflow-y-auto pr-1">
                {form.instructions.map((step, idx) => (
                  <div
                    key={idx}
                    draggable={isReorderingSteps}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx, 'steps')}
                    onDrop={handleDrop}
                    className="flex items-start gap-3 p-3 rounded-xl border transition"
                    style={{
                      backgroundColor: cInputBg,
                      borderColor: isReorderingSteps ? 'var(--color-emerald, #10b981)' : cBorder
                    }}
                  >
                    <span 
                      className="w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-1"
                      style={{
                        backgroundColor: 'rgba(224, 86, 56, 0.15)',
                        color: 'var(--color-primary, #E05638)'
                      }}
                    >
                      {idx + 1}
                    </span>
                    <textarea
                      rows={2}
                      placeholder={(t('describeStepPlaceholder') || 'Describe step {n}...').replace('{n}', String(idx + 1))}
                      value={step}
                      onChange={(e) => {
                        const list = [...form.instructions];
                        list[idx] = e.target.value;
                        setForm({ ...form, instructions: list });
                      }}
                      className="flex-1 bg-transparent border-none outline-none resize-y font-medium"
                      style={{ color: cText }}
                    />

                    {isReorderingSteps ? (
                      <div className="p-2 text-[var(--color-emerald,#10b981)] cursor-grab mt-1">
                        <GripVertical className="h-4 w-4" />
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
                style={{ borderColor: cBorder }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('ingredients')}
                  className="border font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer"
                  style={{
                    backgroundColor: cInputBg,
                    borderColor: cBorder,
                    color: cLabel
                  }}
                >
                  {t('backBtn') || '← Back'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="text-white font-bold px-8 py-3 rounded-xl text-xs transition shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary, #E05638)' }}
                >
                  <Save className="h-4 w-4" /> {saving ? (t('savingRecipe') || 'Saving Recipe...') : (t('saveRecipe') || 'Save Recipe')}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
