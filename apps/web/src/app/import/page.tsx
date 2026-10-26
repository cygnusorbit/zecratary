// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Link2, FileText, Image as ImageIcon, Sparkles, AlertCircle, 
  CheckCircle2, Upload, X, ShieldAlert, Cpu, AlertTriangle,
  Globe, Lock, ArrowRight
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { persistSavedRecipe } from '@/lib/recipeSync';
import { useTranslation } from '@/components/LanguageProvider';
import TokenPurchaseModal from '@/components/TokenPurchaseModal';

const DEFAULT_RECIPE_TYPES = [
  'Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Appetizer', 
  'Side Dish', 'Dessert', 'Snacks', 'Beverages', 'Soup', 'Salad'
];

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&#0*8211;/g, '–')
    .replace(/&#0*8212;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

export default function ImportPage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'image'>('url');
  const [recipeTypes, setRecipeTypes] = useState<string[]>(DEFAULT_RECIPE_TYPES);

  // Form States (Autofill Guardrails)
  const [url, setUrl] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textCategory, setTextCategory] = useState('Main Dish');
  const [rawText, setRawText] = useState('');
  
  // Recipe Visibility Slide-Toggle State
  const [isPublic, setIsPublic] = useState(false);

  // Drag & Drop State with Depth Ref to prevent child bubbling
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Token & AI Settings Telemetry
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenSymbol, setTokenSymbol] = useState<string>('🪙');
  const [tokenName, setTokenName] = useState<string>('Foodie Token');
  const [isTokenEnabled, setIsTokenEnabled] = useState<boolean>(true);
  const [tokenCosts, setTokenCosts] = useState<{ url: number; text: number; photo: number }>({
    url: 2,
    text: 1,
    photo: 3
  });
  const [tokenPackages, setTokenPackages] = useState<any[]>([]);
  const [isTokenPurchaseOpen, setIsTokenPurchaseOpen] = useState(false);

  // Dynamic AI Model Sync
  const [activeAiModel, setActiveAiModel] = useState<string>('gemini-2.5-flash');
  const [activeAiProvider, setActiveAiProvider] = useState<string>('gemini');
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);
  const [strictDietEnforcement, setStrictDietEnforcement] = useState<boolean>(false);
  const [filterWordsList, setFilterWordsList] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchingTelemetry, setFetchingTelemetry] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning'; msg: string; isInsufficient?: boolean } | null>(null);

  // Category Translation Helper
  const getCategoryLabel = useCallback((cat: string) => {
    const keyMap: Record<string, string> = {
      'Main Dish': 'catMainDish',
      'Breakfast': 'catBreakfast',
      'Lunch': 'catLunch',
      'Dinner': 'catDinner',
      'Appetizer': 'catAppetizer',
      'Side Dish': 'catSideDish',
      'Dessert': 'catDessert',
      'Snacks': 'catSnacks',
      'Beverages': 'catBeverages',
      'Soup': 'catSoup',
      'Salad': 'catSalad'
    };
    const transKey = keyMap[cat];
    return transKey ? t(transKey, cat) : cat;
  }, [t]);

  const fetchTokenAndAiTelemetry = useCallback(async () => {
    try {
      const user = getCurrentUser();
      const params = new URLSearchParams();
      if (user?.id) params.set('userId', user.id);
      if (user?.email) params.set('email', user.email);
      const queryParam = params.toString() ? `?${params.toString()}` : '';

      // 1. Authoritative synchronization with AI Settings
      try {
        const aiRes = await fetch(`/api/admin/settings?t=${Date.now()}`, { cache: 'no-store' });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const s = aiData.settings || aiData;
          const chef = aiData.chefAiSettings || s.chefAiSettings || s.aiSettings || {};
          const resolvedModel = aiData.aiModel || chef.model || s.aiModel || s.model;
          const resolvedProvider = aiData.aiProvider || chef.provider || s.aiProvider || 'gemini';

          if (resolvedModel) {
            setActiveAiModel(resolvedModel.replace(/^models\//, ''));
          }
          if (resolvedProvider) {
            setActiveAiProvider(resolvedProvider);
          }
          if (chef.enableWebSearch !== undefined) {
            setEnableWebSearch(Boolean(chef.enableWebSearch));
          } else if (s.enableWebSearch !== undefined) {
            setEnableWebSearch(Boolean(s.enableWebSearch));
          }
          if (chef.strictDietEnforcement !== undefined) {
            setStrictDietEnforcement(Boolean(chef.strictDietEnforcement));
          }
          if (Array.isArray(chef.filterWordsList)) {
            setFilterWordsList(chef.filterWordsList.filter(Boolean));
          }
        }
      } catch (_) {}

      // 2. Fetch user balance & telemetry
      try {
        const res = await fetch(`/api/tokens${queryParam}${queryParam ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTokenBalance(Number(data.balance ?? 0));
            if (data.tokenSymbol) setTokenSymbol(data.tokenSymbol);
            if (data.tokenName) setTokenName(data.tokenName);
            if (data.isEnabled !== undefined) setIsTokenEnabled(Boolean(data.isEnabled));
            if (data.costs) {
              setTokenCosts({
                url: Number(data.costs.importUrl ?? 2),
                text: Number(data.costs.importText ?? 1),
                photo: Number(data.costs.importPhoto ?? 3)
              });
            }
            if (Array.isArray(data.packages) && data.packages.length > 0) {
              setTokenPackages(data.packages);
            }
          }
        }
      } catch (_) {}

      // 3. Direct synchronization with /admin/token-setting
      try {
        let adminRes = await fetch(`/api/admin/token-setting?t=${Date.now()}`, { cache: 'no-store' });
        if (!adminRes.ok) {
          adminRes = await fetch(`/api/admin/token-settings?t=${Date.now()}`, { cache: 'no-store' });
        }
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          const s = adminData.settings || adminData;
          if (s) {
            if (s.tokenSymbol) setTokenSymbol(s.tokenSymbol);
            if (s.tokenName) setTokenName(s.tokenName);
            if (s.isEnabled !== undefined) setIsTokenEnabled(Boolean(s.isEnabled));
            setTokenCosts({
              url: Number(s.importUrlCost ?? 2),
              text: Number(s.importTextCost ?? 1),
              photo: Number(s.importPhotoCost ?? 3)
            });
            if (Array.isArray(s.packages) && s.packages.length > 0) {
              setTokenPackages(s.packages);
            }
          }
        }
      } catch (_) {}
    } catch (err) {
      console.warn('Failed to load token and AI telemetry on /import:', err);
    } finally {
      setFetchingTelemetry(false);
    }
  }, []);

  const fetchRecipeTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/recipe-type', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const types = Array.isArray(data) 
          ? data 
          : Array.isArray(data?.types) 
            ? data.types 
            : Array.isArray(data?.recipeTypes) 
              ? data.recipeTypes 
              : [];
        if (types.length > 0) {
          const names = types.map((item: any) => 
            typeof item === 'string' ? item : item.name || item.title || item.label
          ).filter(Boolean);
          if (names.length > 0) {
            setRecipeTypes(names);
            setTextCategory(prev => names.includes(prev) ? prev : names[0]);
            return;
          }
        }
      }
    } catch (_) {}

    try {
      const stored = localStorage.getItem('zecratary_recipe_types') || 
                     localStorage.getItem('zecratary_recipe_categories');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed.map((item: any) => 
            typeof item === 'string' ? item : item.name || item.title || item.label
          ).filter(Boolean);
          if (names.length > 0) {
            setRecipeTypes(names);
            setTextCategory(prev => names.includes(prev) ? prev : names[0]);
            return;
          }
        }
      }
    } catch (_) {}

    setRecipeTypes(DEFAULT_RECIPE_TYPES);
  }, []);

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Support direct clipboard paste (Ctrl+V / Cmd+V) for image OCR
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== 'image') return;
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const imageFiles: File[] = [];
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          if (e.clipboardData.files[i].type.startsWith('image/')) {
            imageFiles.push(e.clipboardData.files[i]);
          }
        }
        if (imageFiles.length > 0) {
          e.preventDefault();
          handleFilesAdded(imageFiles);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  useEffect(() => {
    document.title = `${t('importRecipeTitle', 'AI Recipe Importer')} - Zecratary`;
    fetchRecipeTypes();
    fetchTokenAndAiTelemetry();

    const handleUpdates = () => {
      fetchTokenAndAiTelemetry();
      fetchRecipeTypes();
    };

    window.addEventListener('zecratary_theme_mode_changed', handleUpdates);
    window.addEventListener('zecratary_token_settings_updated', handleUpdates);
    window.addEventListener('zecratary_tokens_updated', handleUpdates);
    window.addEventListener('zecratary_plans_updated', handleUpdates);
    window.addEventListener('zecratary_users_updated', handleUpdates);
    window.addEventListener('zecratary_admin_settings_updated', handleUpdates);
    window.addEventListener('zecratary_settings_updated', handleUpdates);
    window.addEventListener('zecratary_engine_config_updated', handleUpdates);
    window.addEventListener('zecratary_languages_updated', handleUpdates);
    window.addEventListener('zecratary_dictionary_updated', handleUpdates);
    window.addEventListener('zecratary_locale_changed', handleUpdates);
    window.addEventListener('storage', handleUpdates);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', handleUpdates);
      window.removeEventListener('zecratary_token_settings_updated', handleUpdates);
      window.removeEventListener('zecratary_tokens_updated', handleUpdates);
      window.removeEventListener('zecratary_plans_updated', handleUpdates);
      window.removeEventListener('zecratary_users_updated', handleUpdates);
      window.removeEventListener('zecratary_admin_settings_updated', handleUpdates);
      window.removeEventListener('zecratary_settings_updated', handleUpdates);
      window.removeEventListener('zecratary_engine_config_updated', handleUpdates);
      window.removeEventListener('zecratary_languages_updated', handleUpdates);
      window.removeEventListener('zecratary_dictionary_updated', handleUpdates);
      window.removeEventListener('zecratary_locale_changed', handleUpdates);
      window.removeEventListener('storage', handleUpdates);
    };
  }, [fetchTokenAndAiTelemetry, fetchRecipeTypes, t]);

  const handlePostImportSuccess = async (recipeData: any, consumedTokens: number, newBalance?: number) => {
    const user = getCurrentUser();
    const targetUserId = (user?.id || user?.email || 'usr_admin_1').trim();
    const createdBy = (user?.email || targetUserId).trim();
    const creatorName = (user?.name || 'Chef').trim();

    const resolvedBal = typeof newBalance === 'number' 
      ? newBalance 
      : Math.max(0, tokenBalance - consumedTokens);
    setTokenBalance(resolvedBal);

    const cleanCategory = recipeData.recipeType || recipeData.category || textCategory || 'Main Dish';
    const rawImage = recipeData.image || recipeData.imageUrl || recipeData.image_url || '/uploads/recipes/default.jpg';
    let localhostImage = rawImage;

    if (rawImage && (rawImage.startsWith('http://') || rawImage.startsWith('https://'))) {
      try {
        const dlRes = await fetch('/api/recipes/save-remote-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: rawImage })
        });
        const dlData = await dlRes.json();
        if (dlData.success && (dlData.localPath || dlData.localUrl)) {
          localhostImage = dlData.localPath || dlData.localUrl;
        }
      } catch (_) {}
    }

    const fallbackGuide = t('standardCookingGuidelines', 'Follow standard chef cooking guidelines for this dish.');
    const steps = Array.isArray(recipeData.instructions) && recipeData.instructions.length > 0
      ? recipeData.instructions
      : Array.isArray(recipeData.directions) && recipeData.directions.length > 0
        ? recipeData.directions
        : [fallbackGuide];

    const fallbackTitle = t('importedRecipeFallback', 'Imported Recipe');
    const normalizedRecipe = {
      ...recipeData,
      id: recipeData.id || ('recipe_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)),
      title: decodeHtmlEntities(recipeData.title || textTitle || fallbackTitle),
      name: decodeHtmlEntities(recipeData.title || textTitle || fallbackTitle),
      description: recipeData.description || '',
      userId: targetUserId,
      user_id: targetUserId,
      createdBy: createdBy,
      created_by: createdBy,
      creatorName: creatorName,
      creator_name: creatorName,
      category: cleanCategory,
      recipeType: cleanCategory,
      recipe_type: cleanCategory,
      imageUrl: localhostImage,
      image: localhostImage,
      image_url: localhostImage,
      ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
      instructions: steps,
      directions: steps,
      steps: steps,
      prepTime: String(recipeData.prepTime || recipeData.prepTimeMinutes || '15 mins'),
      cookTime: String(recipeData.cookTime || recipeData.cookTimeMinutes || '25 mins'),
      servings: Number(recipeData.servings) || 4,
      sourceUrl: recipeData.sourceUrl || recipeData.source_url || url || '',
      source_url: recipeData.sourceUrl || recipeData.source_url || url || '',
      isFavorite: false,
      is_public: isPublic,
      isPublic: isPublic,
      rating: 0
    };

    try {
      await Promise.allSettled([
        persistSavedRecipe(targetUserId, normalizedRecipe, { createdBy, creatorName }),
        fetch('/api/saved-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedRecipe)
        }),
        fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedRecipe)
        })
      ]);
    } catch (_) {}

    const storageKeys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes'];
    storageKeys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        const currentList = raw ? JSON.parse(raw) : [];
        const filtered = Array.isArray(currentList)
          ? currentList.filter((r: any) => (r.id !== normalizedRecipe.id && (r.title || r.name)?.toLowerCase() !== normalizedRecipe.title?.toLowerCase()))
          : [];
        localStorage.setItem(key, JSON.stringify([normalizedRecipe, ...filtered]));
      } catch (_) {}
    });

    window.dispatchEvent(new Event('zecratary_recipes_updated'));
    window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
    window.dispatchEvent(new Event('zecratary_tokens_updated'));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));

    try {
      const bc = new BroadcastChannel('zecratary_balance_channel');
      bc.postMessage({ type: 'TOKEN_CONSUMED', balance: resolvedBal });
      bc.close();
    } catch (_) {}

    const deductionMsg = consumedTokens > 0
      ? ` -${consumedTokens} ${tokenSymbol} ${t('deductedToast', 'deducted. Redirecting to Saved Recipes...')}`
      : ` ${t('redirectingToSaved', 'Redirecting to Saved Recipes...')}`;

    setStatus({
      type: 'success',
      msg: `${t('importSuccessToast', 'Successfully imported')} "${normalizedRecipe.title}"!${deductionMsg}`
    });

    setTimeout(() => {
      router.push('/saved');
    }, 850);
  };

  const handleUrlImport = async () => {
    let cleanUrl = url.trim();
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (!enableWebSearch) {
      setStatus({
        type: 'warning',
        msg: t('webSearchDisabledWarning', 'Web URL imports are currently disabled by the administrator in AI Settings.')
      });
      return;
    }

    const cost = isTokenEnabled ? tokenCosts.url : 0;
    if (isTokenEnabled && cost > 0 && tokenBalance < cost) {
      setStatus({
        type: 'error',
        isInsufficient: true,
        msg: `${t('insufficientTokensError', 'Insufficient')} ${tokenName}. ${t('required', 'Required')}: ${cost} ${tokenSymbol}, ${t('balance', 'Balance')}: ${tokenBalance} ${tokenSymbol}.`
      });
      setIsTokenPurchaseOpen(true);
      return;
    }

    setLoading(true);
    setStatus(null);

    const user = getCurrentUser();
    try {
      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'url',
          url: cleanUrl,
          userId: user?.id || user?.email || 'usr_admin_1',
          userEmail: user?.email,
          userName: user?.name,
          category: textCategory,
          isPublic: isPublic,
          model: activeAiModel,
          provider: activeAiProvider
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.insufficientTokens) {
          setIsTokenPurchaseOpen(true);
        }
        throw new Error(data.error || t('failedToExtractUrl', 'Failed to extract recipe from URL.'));
      }

      await handlePostImportSuccess(data.recipe, data.consumedSystemTokens ?? cost, data.remainingBalance);
    } catch (err: any) {
      const isShortfall = err.message?.toLowerCase().includes('insufficient') || err.message?.toLowerCase().includes('token');
      setStatus({ 
        type: 'error', 
        isInsufficient: isShortfall,
        msg: err.message || t('networkError', 'Network error during URL import.') 
      });
      setLoading(false);
    }
  };

  const handleTextImport = async () => {
    if (!rawText.trim()) return;

    const cost = isTokenEnabled ? tokenCosts.text : 0;
    if (isTokenEnabled && cost > 0 && tokenBalance < cost) {
      setStatus({
        type: 'error',
        isInsufficient: true,
        msg: `${t('insufficientTokensError', 'Insufficient')} ${tokenName}. ${t('required', 'Required')}: ${cost} ${tokenSymbol}, ${t('balance', 'Balance')}: ${tokenBalance} ${tokenSymbol}.`
      });
      setIsTokenPurchaseOpen(true);
      return;
    }

    setLoading(true);
    setStatus(null);

    const user = getCurrentUser();
    try {
      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          text: rawText.trim(),
          title: textTitle.trim(),
          category: textCategory,
          isPublic: isPublic,
          userId: user?.id || user?.email || 'usr_admin_1',
          userEmail: user?.email,
          userName: user?.name,
          model: activeAiModel,
          provider: activeAiProvider
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.insufficientTokens) {
          setIsTokenPurchaseOpen(true);
        }
        throw new Error(data.error || t('failedToParseText', 'Failed to parse recipe text.'));
      }

      await handlePostImportSuccess(data.recipe, data.consumedSystemTokens ?? cost, data.remainingBalance);
    } catch (err: any) {
      const isShortfall = err.message?.toLowerCase().includes('insufficient') || err.message?.toLowerCase().includes('token');
      setStatus({ 
        type: 'error', 
        isInsufficient: isShortfall,
        msg: err.message || t('networkError', 'Network error during text import.') 
      });
      setLoading(false);
    }
  };

  // Robust Drag and Drop File Handlers
  const handleFilesAdded = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) validFiles.push(files[i]);
    }
    if (validFiles.length === 0) return;
    const merged = [...selectedFiles, ...validFiles].slice(0, 5);
    setSelectedFiles(merged);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls(merged.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (index: number) => {
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(updatedFiles);
    setPreviewUrls(previewUrls.filter((_, idx) => idx !== index));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleImageImport = async () => {
    if (selectedFiles.length === 0) return;

    const cost = isTokenEnabled ? tokenCosts.photo : 0;
    if (isTokenEnabled && cost > 0 && tokenBalance < cost) {
      setStatus({
        type: 'error',
        isInsufficient: true,
        msg: `${t('insufficientTokensError', 'Insufficient')} ${tokenName}. ${t('required', 'Required')}: ${cost} ${tokenSymbol}, ${t('balance', 'Balance')}: ${tokenBalance} ${tokenSymbol}.`
      });
      setIsTokenPurchaseOpen(true);
      return;
    }

    setLoading(true);
    setStatus(null);

    const user = getCurrentUser();
    try {
      const primaryFile = selectedFiles[0];
      const formData = new FormData();
      formData.append('file', primaryFile);

      let localPhotoPath = '';
      try {
        const uploadRes = await fetch('/api/recipes/upload', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData?.url) localPhotoPath = uploadData.url;
        }
      } catch (_) {}

      let base64Data = '';
      try {
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(primaryFile);
        });
      } catch (_) {}

      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          image: localPhotoPath || base64Data,
          base64: base64Data,
          title: primaryFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          category: textCategory,
          isPublic: isPublic,
          userId: user?.id || user?.email || 'usr_admin_1',
          userEmail: user?.email,
          userName: user?.name,
          model: activeAiModel,
          provider: activeAiProvider
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.insufficientTokens) {
          setIsTokenPurchaseOpen(true);
        }
        throw new Error(data.error || t('failedToProcessPhoto', 'Failed to process recipe image.'));
      }

      await handlePostImportSuccess(data.recipe, data.consumedSystemTokens ?? cost, data.remainingBalance);
    } catch (err: any) {
      const isShortfall = err.message?.toLowerCase().includes('insufficient') || err.message?.toLowerCase().includes('token');
      setStatus({ 
        type: 'error', 
        isInsufficient: isShortfall,
        msg: err.message || t('imageAnalysisFailed', 'Image analysis failed.') 
      });
      setLoading(false);
    }
  };

  return (
    <div 
      id="zecratary-import-canvas"
      role="region"
      aria-label={t('importRecipeTitle', 'AI Recipe Importer')}
      data-lpignore="true"
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 font-sans transition-colors duration-200"
      style={{ 
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        color: 'var(--color-text)' 
      }}
    >
      {/* Header telemetry without badges or inline topup boxes */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Sparkles className="h-6 w-6" /> {t('importRecipeTitle', 'AI Recipe Importer')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('importRecipeSubtitle', 'Import recipes from websites, text notes, or photos and save directly to your recipe library.')}
          </p>
        </div>

        {/* Live Active AI Model & Free Token Mode Telemetry */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
            title={t('activeModelConfiguredTooltip', 'Active Model configured dynamically in /admin/ai-settings')}
          >
            <Cpu className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span className="font-mono">{activeAiModel}</span>
          </div>

          {!isTokenEnabled && (
            <div 
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider"
              style={{ 
                backgroundColor: 'var(--color-inner-dark)', 
                borderColor: 'var(--color-emerald)',
                color: 'var(--color-emerald)'
              }}
              title={t('tokenFreeModeTooltip', 'Token consumption is currently bypassed (Free Mode) in /admin/token-setting')}
            >
              <Sparkles className="h-3 w-3" />
              <span>{t('tokenFreeModeBadge', 'Free Token Mode')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Fluid Card: 100% Fluid Width with Smooth Theme Transitions */}
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
        {/* Method Tab Bar with Token Cost Pills */}
        <div 
          className="flex p-1.5 rounded-2xl border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)'
          }}
        >
          {[
            { id: 'url', label: t('urlTab', 'Web URL'), icon: Link2, cost: tokenCosts.url },
            { id: 'text', label: t('textTab', 'Recipe Text'), icon: FileText, cost: tokenCosts.text },
            { id: 'image', label: t('imageTab', 'Photo / OCR'), icon: ImageIcon, cost: tokenCosts.photo },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setStatus(null);
                }}
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
                <span 
                  className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: isActive ? 'var(--color-inner-dark)' : 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {isTokenEnabled && tab.cost > 0 ? `${tab.cost} ${tokenSymbol}` : t('freeBadge', 'Free')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dietary Restriction Guidance Banner */}
        {strictDietEnforcement && filterWordsList.length > 0 && (
          <div 
            className="p-3 border rounded-2xl text-[11px] flex items-center justify-between"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
              <span>
                <strong>{t('dietNoticeTitle', 'AI Dietary Restrictions Enforced')}:</strong> {t('dietNoticeDesc', 'Recipes containing avoid terms')} ({filterWordsList.slice(0, 4).join(', ')}{filterWordsList.length > 4 ? '...' : ''}) {t('willBeBlocked', 'will be automatically blocked.')}
              </span>
            </div>
          </div>
        )}

        {/* Slide-Toggle Button: Show Private / Public Marketplace */}
        <div 
          className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl border flex items-center justify-center shrink-0 transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: isPublic ? '#ea580c' : 'var(--color-text-secondary)'
              }}
            >
              {isPublic ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <span>{t('visibilityLabel', 'Recipe Visibility')}:</span>
                <span 
                  className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide border transition-colors duration-200"
                  style={isPublic ? {
                    backgroundColor: 'rgba(234, 88, 12, 0.12)',
                    borderColor: 'rgba(234, 88, 12, 0.35)',
                    color: '#ea580c'
                  } : {
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {isPublic ? t('publicMarketplace', 'Public Marketplace') : t('privateRecipe', 'Private Recipe')}
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {isPublic 
                  ? t('visibilityPublicDesc', 'Published to the community marketplace for all foodies to discover')
                  : t('visibilityPrivateDesc', 'Saved exclusively to your personal recipe box')}
              </p>
            </div>
          </div>

          {/* Standard Repository Slide-Toggle Switch */}
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <span 
              className="text-[11px] font-bold uppercase transition-colors duration-200 select-none hidden sm:inline"
              style={{ 
                color: isPublic ? '#ea580c' : 'var(--color-text-secondary)' 
              }}
            >
              {isPublic ? t('publicMarketplace', 'Public') : t('privateRecipe', 'Private')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(prev => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-xs ${
                isPublic ? '' : 'bg-gray-300 dark:bg-gray-700'
              }`}
              style={{
                backgroundColor: isPublic ? '#ea580c' : undefined
              }}
              title={isPublic ? t('publicMarketplace', 'Public Marketplace') : t('privateRecipe', 'Private Recipe')}
            >
              <span className="sr-only">{isPublic ? t('publicMarketplace', 'Public Marketplace') : t('privateRecipe', 'Private Recipe')}</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* TAB 1: URL IMPORT */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            {!enableWebSearch && (
              <div 
                className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2"
                style={{ 
                  backgroundColor: 'var(--color-inner-dark)', 
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-primary)'
                }}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{t('webSearchDisabledWarning', 'Web URL imports are currently disabled by the administrator in AI Settings.')}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
                {t('recipeWebUrlLabel', 'Recipe Web URL *')}
              </label>
              <input
                type="url"
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck="false"
                disabled={!enableWebSearch}
                placeholder={t('recipeWebUrlPlaceholder', 'https://www.recipetineats.com/... or food blog URL')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUrlImport();
                  }
                }}
                className="w-full border rounded-xl px-4 py-3.5 text-sm outline-none transition font-medium disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#ea580c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>

            {/* Ember Next Button */}
            <button
              type="button"
              onClick={() => handleUrlImport()}
              disabled={loading || !url.trim() || !enableWebSearch}
              className="w-full text-white font-black py-4 rounded-xl transition flex items-center justify-center gap-2.5 text-sm tracking-wide shadow-xl cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 20px -4px rgba(234, 88, 12, 0.45)',
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}
            >
              <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>
                {loading 
                  ? t('downloadingPhotoParsingSteps', 'Parsing recipe & deducting tokens...') 
                  : isTokenEnabled && tokenCosts.url > 0
                    ? `${t('nextImportRecipe', 'Next: Import Recipe')} (${tokenCosts.url} ${tokenSymbol})`
                    : `${t('nextImportRecipe', 'Next: Import Recipe')} (${t('freeBadge', 'Free')})`}
              </span>
              <ArrowRight className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        )}

        {/* TAB 2: TEXT IMPORT */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  {t('recipeTitleLabel', 'Recipe Title (Optional)')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder={t('recipeTitlePlaceholder', 'e.g. Homemade Apple Cake')}
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTextImport();
                    }
                  }}
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none font-medium"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#ea580c')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  {t('categoryLabel', 'Category (Recipe Type)')}
                </label>
                <select
                  value={textCategory}
                  onChange={(e) => setTextCategory(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none cursor-pointer font-bold"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {recipeTypes.map(c => (
                    <option key={c} value={c} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {getCategoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
                {t('pasteIngredientsSteps', 'Paste Ingredients & Steps *')}
              </label>
              <textarea
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                spellCheck="false"
                rows={7}
                placeholder={t('pasteRecipeContentPlaceholder', 'Paste ingredients and cooking steps here... (Ctrl+Enter to Import)')}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleTextImport();
                  }
                }}
                className="w-full border rounded-xl p-4 text-xs outline-none resize-none font-mono"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#ea580c')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>

            {/* Ember Next Button */}
            <button
              type="button"
              onClick={() => handleTextImport()}
              disabled={loading || !rawText.trim()}
              className="w-full text-white font-black py-4 rounded-xl transition flex items-center justify-center gap-2.5 text-sm tracking-wide shadow-xl cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 20px -4px rgba(234, 88, 12, 0.45)',
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}
            >
              <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>
                {loading 
                  ? t('processingSavingRecipe', 'Processing & saving recipe...') 
                  : isTokenEnabled && tokenCosts.text > 0
                    ? `${t('nextBtn', 'Next')}: ${t('saveAndImportRecipe', 'Save & Import Recipe')} (${tokenCosts.text} ${tokenSymbol})`
                    : `${t('nextBtn', 'Next')}: ${t('saveAndImportRecipe', 'Save & Import Recipe')} (${t('freeBadge', 'Free')})`}
              </span>
              <ArrowRight className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        )}

        {/* TAB 3: IMAGE / PHOTO OCR IMPORT */}
        {activeTab === 'image' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  {t('recipeImagesMax5', 'Recipe Images (up to 5)')}
                </label>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('pasteClipboardPrompt', 'Or paste screenshot from clipboard (Ctrl+V)')}
                </span>
              </div>

              {/* Drag and Drop Zone with depth tracking & visual feedback */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-3xl py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 relative select-none"
                style={{
                  borderColor: isDragging ? '#ea580c' : 'var(--color-border)',
                  backgroundColor: isDragging ? 'rgba(234, 88, 12, 0.08)' : 'var(--color-inner-dark)',
                  transform: isDragging ? 'scale(1.008)' : 'scale(1)'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) handleFilesAdded(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3.5 border pointer-events-none transition-transform duration-200"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: isDragging ? '#ea580c' : 'var(--color-border)',
                    transform: isDragging ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  <Upload 
                    className="h-8 w-8 stroke-[2.3]" 
                    style={{ color: isDragging ? '#ea580c' : 'var(--color-primary)' }} 
                  />
                </div>
                <p className="text-xs sm:text-sm font-semibold tracking-wide pointer-events-none" style={{ color: 'var(--color-text)' }}>
                  <span style={{ color: isDragging ? '#ea580c' : 'var(--color-primary)' }} className="font-extrabold">
                    {isDragging ? t('dropImagesHere', 'Drop recipe photos here...') : t('clickToUpload', 'Click to upload')}
                  </span>{' '}
                  <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    {!isDragging && t('orDragAndDrop', 'or drag and drop')}
                  </span>
                </p>
                <p className="text-[11px] font-medium mt-1 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('pngJpgWebpMax5', 'PNG, JPG, or WEBP (Cookbook captures or food photos)')}
                </p>
              </div>
            </div>

            {previewUrls.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold" style={{ color: 'var(--color-text)' }}>
                  {t('selectedPhotos', 'Selected Photos')} ({previewUrls.length}/5):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {previewUrls.map((previewUrl, idx) => (
                    <div
                      key={idx}
                      className="relative h-24 rounded-2xl overflow-hidden border group shadow"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-inner-dark)'
                      }}
                    >
                      <img src={previewUrl} alt={`${t('previewImageAlt', 'Recipe image preview')} ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/75 hover:bg-black text-white rounded-full transition cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ember Next Button */}
            <button
              type="button"
              onClick={() => handleImageImport()}
              disabled={loading || selectedFiles.length === 0}
              className="w-full text-white font-black py-4 rounded-xl transition flex items-center justify-center gap-2.5 text-sm tracking-wide shadow-xl cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 20px -4px rgba(234, 88, 12, 0.45)',
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}
            >
              <Upload className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>
                {loading 
                  ? t('aiSearchingRecipeImporting', 'AI OCR analyzing & importing...') 
                  : isTokenEnabled && tokenCosts.photo > 0
                    ? `${t('nextBtn', 'Next')}: ${t('importRecipeFromImages', 'Import Recipe from Images')} (${tokenCosts.photo} ${tokenSymbol})`
                    : `${t('nextBtn', 'Next')}: ${t('importRecipeFromImages', 'Import Recipe from Images')} (${t('freeBadge', 'Free')})`}
              </span>
              <ArrowRight className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        )}

        {/* Status Banner */}
        {status && (
          <div
            className="p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: status.type === 'success' 
                ? 'var(--color-emerald)' 
                : status.type === 'warning' 
                  ? 'var(--color-border)' 
                  : 'rgba(239, 68, 68, 0.4)',
              color: status.type === 'success' ? 'var(--color-emerald)' : status.type === 'warning' ? '#f59e0b' : '#ef4444'
            }}
          >
            <div className="flex items-center gap-2">
              {status.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
              ) : status.type === 'warning' ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              )}
              <span>{status.msg}</span>
            </div>

            {status.isInsufficient && (
              <button
                type="button"
                onClick={() => setIsTokenPurchaseOpen(true)}
                className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-white shrink-0 cursor-pointer shadow-sm hover:opacity-90"
                style={{ backgroundColor: '#ea580c' }}
              >
                {t('buyTokensNowBtn', 'Buy Tokens')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Accessible Token Purchase Modal */}
      <TokenPurchaseModal
        isOpen={isTokenPurchaseOpen}
        onClose={() => setIsTokenPurchaseOpen(false)}
        userId={getCurrentUser()?.id || getCurrentUser()?.email || 'usr_admin_1'}
        userEmail={getCurrentUser()?.email}
        tokenSymbol={tokenSymbol}
        packages={tokenPackages}
        onPurchased={(newBal) => {
          setTokenBalance(newBal);
          setStatus({
            type: 'success',
            msg: `${t('tokensAddedSuccess', 'Tokens added successfully!')} ${t('newBalance', 'New Balance')}: ${newBal} ${tokenSymbol}`
          });
        }}
      />
    </div>
  );
}
