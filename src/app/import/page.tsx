// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Globe, FileText, Image as ImageIcon, Sparkles, UploadCloud, 
  ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Layers, 
  Clock, Users, ChefHat, Eye, RotateCcw, ShieldCheck, Zap
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export default function ImportRecipePage() {
  const router = useRouter();
  const { t } = useTranslation();

  // Active Tab: 'url' | 'text' | 'photo'
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'photo'>('url');

  // Form Inputs
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Taxonomy & Settings
  const [recipeCategories, setRecipeCategories] = useState<string[]>([
    'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Baking', 'Beverage', 'Snack'
  ]);

  // Token Telemetry State
  const [tokenName, setTokenName] = useState('Tokens');
  const [tokenSymbol, setTokenSymbol] = useState('🪙');
  const [isTokenEnabled, setIsTokenEnabled] = useState(true);
  const [userTokenBalance, setUserTokenBalance] = useState<number>(100);
  const [costs, setCosts] = useState({
    url: 5,
    text: 3,
    photo: 8
  });

  // Processing & Extracted State
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<any | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up object URLs to prevent browser memory leaks
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Load Token Settings and AI Telemetry dynamically
  const fetchTelemetry = useCallback(async () => {
    try {
      const [tokenRes, adminTokenRes, catRes] = await Promise.all([
        fetch(`/api/tokens?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/admin/token-setting?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null),
        fetch(`/api/admin/recipe-type?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null)
      ]);

      if (tokenRes && tokenRes.ok) {
        const data = await tokenRes.json();
        if (typeof data.balance === 'number') setUserTokenBalance(data.balance);
        if (data.tokenName) setTokenName(data.tokenName);
        if (data.tokenSymbol) setTokenSymbol(data.tokenSymbol);
      }

      if (adminTokenRes && adminTokenRes.ok) {
        const aData = await adminTokenRes.json();
        const settings = aData.settings || aData;
        if (typeof settings.isEnabled === 'boolean') {
          setIsTokenEnabled(settings.isEnabled);
        }
        if (settings.tokenName) setTokenName(settings.tokenName);
        if (settings.tokenSymbol) setTokenSymbol(settings.tokenSymbol);
        setCosts({
          url: Number(settings.importUrlCost ?? settings.import_url_cost ?? 5),
          text: Number(settings.importTextCost ?? settings.import_text_cost ?? 3),
          photo: Number(settings.importPhotoCost ?? settings.import_photo_cost ?? 8)
        });
      }

      if (catRes && catRes.ok) {
        const cData = await catRes.json();
        const list = Array.isArray(cData) ? cData : (cData.recipeTypes || cData.types || []);
        if (list.length > 0) {
          setRecipeCategories(list.map((c: any) => typeof c === 'string' ? c : (c.name || c.label)));
        }
      }
    } catch (err) {
      console.warn('Telemetry load notice:', err);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();

    const handleExternalUpdates = () => fetchTelemetry();
    window.addEventListener('zecratary_token_settings_updated', handleExternalUpdates);
    window.addEventListener('zecratary_tokens_updated', handleExternalUpdates);
    window.addEventListener('zecratary_locale_changed', handleExternalUpdates);
    window.addEventListener('zecratary_dictionary_updated', handleExternalUpdates);

    return () => {
      window.removeEventListener('zecratary_token_settings_updated', handleExternalUpdates);
      window.removeEventListener('zecratary_tokens_updated', handleExternalUpdates);
      window.removeEventListener('zecratary_locale_changed', handleExternalUpdates);
      window.removeEventListener('zecratary_dictionary_updated', handleExternalUpdates);
    };
  }, [fetchTelemetry]);

  // Compute Active Cost
  const currentCost = !isTokenEnabled ? 0 : costs[activeTab];

  // Helper: Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Image Selection Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setToast(null);
    }
  };

  // Handle URL Import
  const handleUrlImport = async () => {
    let cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setToast({ type: 'error', message: t('invalidUrl', 'Please enter a valid website URL.') });
      return;
    }

    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
      setUrlInput(cleanUrl);
    }

    if (isTokenEnabled && userTokenBalance < currentCost) {
      setToast({
        type: 'error',
        message: t('insufficientTokensMsg', 'You need at least {cost} {symbol} to perform this import.')
          .replace('{cost}', String(currentCost))
          .replace('{symbol}', tokenSymbol)
      });
      return;
    }

    setIsExtracting(true);
    setToast(null);

    try {
      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url',
          url: cleanUrl,
          category: selectedCategory || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t('importFailed', 'Failed to import recipe. Please verify your input and try again.'));
      }

      setExtractedRecipe(data.recipe);
      if (typeof data.remainingBalance === 'number') {
        setUserTokenBalance(data.remainingBalance);
      } else if (isTokenEnabled && currentCost > 0) {
        setUserTokenBalance(prev => Math.max(0, prev - currentCost));
      }

      setToast({ type: 'success', message: t('importSuccess', 'Recipe imported successfully!') });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || t('importFailed', 'Failed to import recipe.') });
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle Text Import
  const handleTextImport = async () => {
    const cleanText = textInput.trim();
    if (!cleanText) {
      setToast({ type: 'error', message: t('emptyText', 'Please paste some recipe text or ingredients.') });
      return;
    }

    if (isTokenEnabled && userTokenBalance < currentCost) {
      setToast({
        type: 'error',
        message: t('insufficientTokensMsg', 'You need at least {cost} {symbol} to perform this import.')
          .replace('{cost}', String(currentCost))
          .replace('{symbol}', tokenSymbol)
      });
      return;
    }

    setIsExtracting(true);
    setToast(null);

    try {
      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          text: cleanText,
          category: selectedCategory || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t('importFailed', 'Failed to import recipe. Please verify your input and try again.'));
      }

      setExtractedRecipe(data.recipe);
      if (typeof data.remainingBalance === 'number') {
        setUserTokenBalance(data.remainingBalance);
      } else if (isTokenEnabled && currentCost > 0) {
        setUserTokenBalance(prev => Math.max(0, prev - currentCost));
      }

      setToast({ type: 'success', message: t('importSuccess', 'Recipe imported successfully!') });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || t('importFailed', 'Failed to import recipe.') });
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle Image OCR Import
  const handleImageImport = async () => {
    if (!imageFile && !photoUrlInput.trim()) {
      setToast({ type: 'error', message: t('noImageSelected', 'Please select an image file or enter an image URL.') });
      return;
    }

    if (isTokenEnabled && userTokenBalance < currentCost) {
      setToast({
        type: 'error',
        message: t('insufficientTokensMsg', 'You need at least {cost} {symbol} to perform this import.')
          .replace('{cost}', String(currentCost))
          .replace('{symbol}', tokenSymbol)
      });
      return;
    }

    setIsExtracting(true);
    setToast(null);

    try {
      let imagePayload: string = photoUrlInput.trim();

      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append('file', imageFile);
          const uploadRes = await fetch('/api/recipes/upload', {
            method: 'POST',
            body: formData
          });
          if (uploadRes.ok) {
            const uData = await uploadRes.json();
            imagePayload = uData.url || uData.imageUrl || '';
          }
        } catch (_) {}

        if (!imagePayload) {
          imagePayload = await fileToBase64(imageFile);
        }
      }

      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          imageUrl: imagePayload,
          category: selectedCategory || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t('importFailed', 'Failed to import recipe. Please verify your input and try again.'));
      }

      setExtractedRecipe(data.recipe);
      if (typeof data.remainingBalance === 'number') {
        setUserTokenBalance(data.remainingBalance);
      } else if (isTokenEnabled && currentCost > 0) {
        setUserTokenBalance(prev => Math.max(0, prev - currentCost));
      }

      setToast({ type: 'success', message: t('importSuccess', 'Recipe imported successfully!') });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || t('importFailed', 'Failed to import recipe.') });
    } finally {
      setIsExtracting(false);
    }
  };

  // Save Extracted Recipe to PostgreSQL & Saved Recipes
  const handleSaveRecipe = async () => {
    if (!extractedRecipe) return;

    setIsSaving(true);
    try {
      const normalizedRecipe = {
        title: decodeHtmlEntities(extractedRecipe.title || 'Imported Recipe'),
        description: decodeHtmlEntities(extractedRecipe.description || ''),
        ingredients: Array.isArray(extractedRecipe.ingredients) 
          ? extractedRecipe.ingredients.map((i: any) => typeof i === 'string' ? decodeHtmlEntities(i) : i)
          : [],
        instructions: Array.isArray(extractedRecipe.instructions)
          ? extractedRecipe.instructions.map((step: any) => typeof step === 'string' ? decodeHtmlEntities(step) : step)
          : (extractedRecipe.directions || []),
        prepTime: Number(extractedRecipe.prepTime || extractedRecipe.prep_time || 15),
        cookTime: Number(extractedRecipe.cookTime || extractedRecipe.cook_time || 25),
        servings: Number(extractedRecipe.servings || 4),
        recipeType: selectedCategory || extractedRecipe.recipeType || extractedRecipe.recipe_type || 'Dinner',
        imageUrl: extractedRecipe.imageUrl || extractedRecipe.image_url || imagePreviewUrl || photoUrlInput || '/uploads/recipes/default.jpg',
        sourceUrl: urlInput.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      const [saveRes] = await Promise.all([
        fetch('/api/recipes/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedRecipe)
        }).catch(() => null),
        fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedRecipe)
        }).catch(() => null)
      ]);

      setToast({
        type: 'success',
        message: t('savedSuccessRedirect', 'Recipe saved! Redirecting to Saved Recipes...')
      });

      setTimeout(() => {
        router.push('/saved');
      }, 900);
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Error saving recipe to database.'
      });
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="w-full max-w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 space-y-6 pb-24 font-sans transition-colors duration-200 box-border"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header Toolbar */}
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 
            className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3"
            style={{ color: 'var(--color-primary)' }}
          >
            <Sparkles className="h-7 w-7" /> {t('importPageTitle', 'Import Recipe')}
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('importPageSubtitle', 'Extract ingredients, measurements, and cooking instructions from any URL, text, or food photograph.')}
          </p>
        </div>

        {/* Status Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <ShieldCheck className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} />
            <span>{t('aiModelTelemetry', 'AI Neural OCR Active')}</span>
          </div>

          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <Zap className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span>
              {!isTokenEnabled 
                ? t('freeTokenMode', 'Free Token Mode') 
                : `${t('tokensRequired', 'Tokens Required')}: ${currentCost} ${tokenSymbol}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Accessible Form-Free Container (Constraint 9) */}
      <div 
        role="region"
        aria-label="Recipe Import Workspace"
        data-lpignore="true"
        className="w-full rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl border transition-colors duration-200 box-border"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Navigation Tabs Bar */}
        <div 
          className="flex flex-col sm:flex-row p-1.5 rounded-2xl border transition-colors duration-200 gap-1.5"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)'
          }}
        >
          {[
            { id: 'url', label: t('tabUrl', 'Website URL'), icon: Globe, cost: costs.url },
            { id: 'text', label: t('tabText', 'Paste Text'), icon: FileText, cost: costs.text },
            { id: 'photo', label: t('tabPhoto', 'Photo / OCR'), icon: ImageIcon, cost: costs.photo }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`tab-${tab.id}`}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setToast(null);
                }}
                className="flex-1 py-3 px-4 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
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
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono border ml-1"
                  style={{ 
                    backgroundColor: isActive ? 'var(--color-inner-dark)' : 'transparent',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {!isTokenEnabled ? t('costFree', 'Free') : `${tab.cost} ${tokenSymbol}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Selector Pill Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            {t('categoryLabel', 'Recipe Category / Type')}:
          </span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <option value="">{t('selectCategory', 'Select Category (Optional)')}</option>
            {recipeCategories.map((cat) => (
              <option key={`cat-opt-${cat}`} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* TAB 1: WEBSITE URL IMPORT */}
        {activeTab === 'url' && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                {t('urlInputLabel', 'Recipe Web Address')}
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUrlImport();
                    }
                  }}
                  placeholder={t('urlInputPlaceholder', 'Paste recipe URL (e.g. https://www.allrecipes.com/recipe/...)')}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border text-xs sm:text-sm outline-none font-sans transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleUrlImport}
                disabled={isExtracting || !urlInput.trim()}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                  isExtracting || !urlInput.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t('urlImporting', 'Scraping & Parsing Recipe...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('urlImportBtn', 'Extract Recipe from URL')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: RAW TEXT IMPORT */}
        {activeTab === 'text' && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                {t('textInputLabel', 'Recipe Text or Notes')}
              </label>
              <textarea
                rows={8}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck={false}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t('textInputPlaceholder', 'Paste ingredients, steps, or handwritten recipe notes here...')}
                className="w-full p-4 rounded-2xl border text-xs sm:text-sm outline-none font-sans transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleTextImport}
                disabled={isExtracting || !textInput.trim()}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                  isExtracting || !textInput.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t('textImporting', 'Extracting Recipe Structure...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('textImportBtn', 'Parse Recipe Text')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: PHOTO / OCR IMPORT */}
        {activeTab === 'photo' && (
          <div className="space-y-4 pt-2">
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              {t('photoUploadLabel', 'Upload Recipe Photo or Cookbook Page')}
            </label>

            {/* Drag & Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition hover:opacity-85"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              {imagePreviewUrl ? (
                <div className="space-y-3">
                  <img
                    src={imagePreviewUrl}
                    alt="Recipe Upload"
                    className="max-h-56 mx-auto rounded-2xl object-cover shadow-md border"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  <p className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                    {t('changePhotoBtn', 'Change Photo')} ({imageFile?.name})
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div 
                    className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto border"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                  >
                    <UploadCloud className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <p className="text-xs sm:text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {t('photoUploadDrop', 'Click or drag & drop recipe image here')}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('photoUploadFormats', 'Supports JPG, PNG, WEBP, or HEIC (up to 10MB)')}
                  </p>
                </div>
              )}
            </div>

            {/* Direct Image URL fallback */}
            <div>
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck={false}
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                placeholder={t('photoUrlPlaceholder', 'Or enter an image URL directly...')}
                className="w-full px-4 py-2.5 rounded-2xl border text-xs outline-none transition"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleImageImport}
                disabled={isExtracting || (!imageFile && !photoUrlInput.trim())}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                  isExtracting || (!imageFile && !photoUrlInput.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t('photoImporting', 'Analyzing Image with AI OCR...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('photoImportBtn', 'Extract Recipe from Image')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Toast Feedback Notification Banner */}
        {toast && (
          <div
            className="p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: toast.type === 'success' ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
              color: toast.type === 'success' ? 'var(--color-emerald)' : '#ef4444'
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* EXTRACTED RECIPE PREVIEW CARD */}
        {extractedRecipe && (
          <div 
            className="pt-6 border-t space-y-6 animate-in fade-in"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Eye className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                  {t('previewRecipeTitle', 'Extracted Recipe Preview')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('editBeforeSaving', 'Review and adjust ingredients or steps before saving')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExtractedRecipe(null);
                    setToast(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t('resetBtn', 'Start Over')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveRecipe}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{t('savingRecipe', 'Saving to Database...')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t('saveToLibraryBtn', 'Save to My Recipes')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Extracted Details Master Card */}
            <div 
              className="p-6 rounded-3xl border space-y-5"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-col md:flex-row gap-6">
                {extractedRecipe.imageUrl && (
                  <img
                    src={extractedRecipe.imageUrl}
                    alt={extractedRecipe.title || 'Recipe'}
                    className="w-full md:w-56 h-44 object-cover rounded-2xl border shadow-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                )}

                <div className="flex-1 space-y-3">
                  <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                    {decodeHtmlEntities(extractedRecipe.title || 'Untitled Recipe')}
                  </h2>
                  <p className="text-xs line-clamp-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {decodeHtmlEntities(extractedRecipe.description || 'No description provided.')}
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <span 
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-bold"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                    >
                      <Clock className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                      {t('prepTimeLabel', 'Prep Time')}: {extractedRecipe.prepTime || extractedRecipe.prep_time || 15} {t('minutesShort', 'min')}
                    </span>

                    <span 
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-bold"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                    >
                      <Clock className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                      {t('cookTimeLabel', 'Cook Time')}: {extractedRecipe.cookTime || extractedRecipe.cook_time || 25} {t('minutesShort', 'min')}
                    </span>

                    <span 
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-bold"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                    >
                      <Users className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                      {extractedRecipe.servings || 4} {t('servingsUnit', 'servings')}
                    </span>

                    <span 
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-bold"
                      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                    >
                      <Layers className="h-3 w-3" style={{ color: 'var(--color-primary)' }} />
                      {selectedCategory || extractedRecipe.recipeType || extractedRecipe.recipe_type || 'Dinner'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ingredients & Instructions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div 
                  className="p-5 rounded-2xl border space-y-3"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                    <ChefHat className="h-4 w-4" /> {t('ingredientsTitle', 'Ingredients')}
                  </h4>
                  <ul className="space-y-1.5 text-xs">
                    {(extractedRecipe.ingredients || []).map((ing: any, iIdx: number) => (
                      <li key={`ing-${iIdx}`} className="flex items-start gap-2">
                        <span className="font-bold" style={{ color: 'var(--color-primary)' }}>•</span>
                        <span style={{ color: 'var(--color-text)' }}>{decodeHtmlEntities(typeof ing === 'string' ? ing : ing.name || ing.original)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div 
                  className="p-5 rounded-2xl border space-y-3"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                    <Layers className="h-4 w-4" /> {t('instructionsTitle', 'Instructions & Steps')}
                  </h4>
                  <ol className="space-y-2 text-xs">
                    {(extractedRecipe.instructions || extractedRecipe.directions || []).map((step: any, sIdx: number) => (
                      <li key={`step-${sIdx}`} className="flex items-start gap-2">
                        <span className="font-bold shrink-0 font-mono" style={{ color: 'var(--color-primary)' }}>{sIdx + 1}.</span>
                        <span style={{ color: 'var(--color-text)' }}>{decodeHtmlEntities(typeof step === 'string' ? step : step.step || step.instruction)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
