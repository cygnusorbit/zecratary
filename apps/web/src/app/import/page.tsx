// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Link2, FileText, Image as ImageIcon, Sparkles, AlertCircle, 
  CheckCircle2, Upload, X, Coins, ShieldAlert, Globe, 
  Cpu, ArrowRight, RefreshCw, AlertTriangle
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { persistSavedRecipe } from '@/lib/recipeSync';
import { useTranslation } from '@/components/LanguageProvider';
import TokenPurchaseModal from '@/components/TokenPurchaseModal';

const DEFAULT_RECIPE_TYPES = [
  'Main Dish', 'Breakfast', 'Lunch', 'Dinner', 'Appetizer', 
  'Side Dish', 'Dessert', 'Snacks', 'Beverages', 'Soup', 'Salad'
];

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
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

  // Form States
  const [url, setUrl] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textCategory, setTextCategory] = useState('Main Dish');
  const [rawText, setRawText] = useState('');
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Token & AI Settings Telemetry
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenSymbol, setTokenSymbol] = useState<string>('🪙');
  const [tokenName, setTokenName] = useState<string>('Foodie Token');
  const [tokenCosts, setTokenCosts] = useState<{ url: number; text: number; photo: number }>({
    url: 2,
    text: 1,
    photo: 3
  });
  const [tokenPackages, setTokenPackages] = useState<any[]>([]);
  const [isTokenPurchaseOpen, setIsTokenPurchaseOpen] = useState(false);

  // Synced from /admin/ai-settings
  const [activeAiModel, setActiveAiModel] = useState<string>('gemini-3.5-flash-lite');
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(true);
  const [strictDietEnforcement, setStrictDietEnforcement] = useState<boolean>(false);
  const [filterWordsList, setFilterWordsList] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchingTelemetry, setFetchingTelemetry] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning'; msg: string } | null>(null);

  const fetchTokenAndAiTelemetry = useCallback(async () => {
    try {
      const user = getCurrentUser();
      const queryParam = user?.id ? `?userId=${user.id}` : user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const res = await fetch(`/api/tokens${queryParam}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        setTokenBalance(Number(data.balance ?? 0));
        setTokenSymbol(data.tokenSymbol || '🪙');
        setTokenName(data.tokenName || 'Foodie Token');
        if (data.costs) {
          setTokenCosts({
            url: Number(data.costs.importUrl ?? 2),
            text: Number(data.costs.importText ?? 1),
            photo: Number(data.costs.importPhoto ?? 3)
          });
        }
        if (data.packages) {
          setTokenPackages(data.packages);
        }
        if (data.aiSettings) {
          setActiveAiModel(data.aiSettings.model || 'gemini-3.5-flash-lite');
          setEnableWebSearch(data.aiSettings.enableWebSearch !== false);
          setStrictDietEnforcement(Boolean(data.aiSettings.strictDietEnforcement));
          setFilterWordsList(Array.isArray(data.aiSettings.filterWordsList) ? data.aiSettings.filterWordsList : []);
        }
      }
    } catch (err) {
      console.warn('Failed to load token and AI telemetry on /import:', err);
    } finally {
      setFetchingTelemetry(false);
    }
  }, []);

  const syncRecipeTypes = () => {
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
            if (!names.includes(textCategory)) {
              setTextCategory(names[0]);
            }
            return;
          }
        }
      }
    } catch (_) {}
    setRecipeTypes(DEFAULT_RECIPE_TYPES);
  };

  useEffect(() => {
    document.title = `${t('importRecipeTitle', 'Import Recipe')} - Zecratary`;
    syncRecipeTypes();
    fetchTokenAndAiTelemetry();

    const handleUpdates = () => {
      fetchTokenAndAiTelemetry();
      syncRecipeTypes();
    };

    window.addEventListener('zecratary_users_updated', handleUpdates);
    window.addEventListener('zecratary_admin_settings_updated', handleUpdates);
    window.addEventListener('storage', handleUpdates);

    return () => {
      window.removeEventListener('zecratary_users_updated', handleUpdates);
      window.removeEventListener('zecratary_admin_settings_updated', handleUpdates);
      window.removeEventListener('storage', handleUpdates);
    };
  }, [fetchTokenAndAiTelemetry, t]);

  const handlePostImportSuccess = async (recipeData: any, consumedTokens: number, newBalance?: number) => {
    const user = getCurrentUser();
    const targetUserId = (user?.id || user?.email || 'usr_admin_1').trim();

    if (typeof newBalance === 'number') {
      setTokenBalance(newBalance);
    } else {
      setTokenBalance(prev => Math.max(0, prev - consumedTokens));
    }

    // Ensure PostgreSQL saved_recipes persistence
    try {
      await persistSavedRecipe(targetUserId, recipeData, {
        createdBy: user?.email || targetUserId,
        creatorName: user?.name || 'You'
      });
    } catch (_) {}

    // Synchronize to localStorage for instantaneous client response
    const storageKeys = ['zecratary_recipes', 'zecratary_saved_recipes', 'saved_recipes'];
    storageKeys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        const currentList = raw ? JSON.parse(raw) : [];
        const filtered = Array.isArray(currentList)
          ? currentList.filter((r: any) => (r.id !== recipeData.id && (r.title || r.name)?.toLowerCase() !== recipeData.title?.toLowerCase()))
          : [];
        localStorage.setItem(key, JSON.stringify([recipeData, ...filtered]));
      } catch (_) {}
    });

    window.dispatchEvent(new Event('zecratary_recipes_updated'));
    window.dispatchEvent(new Event('zecratary_saved_recipes_updated'));
    window.dispatchEvent(new Event('zecratary_users_updated'));
    window.dispatchEvent(new Event('storage'));

    setStatus({
      type: 'success',
      msg: `${t('importSuccessToast', 'Successfully imported')} "${recipeData.title}"! -${consumedTokens} ${tokenSymbol} ${t('deductedToast', 'deducted. Redirecting to Saved Recipes...')}`
    });

    setTimeout(() => {
      router.push('/saved');
    }, 850);
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!enableWebSearch) {
      setStatus({
        type: 'warning',
        msg: t('webSearchDisabledMsg', 'Web URL imports are disabled by the administrator in AI Settings.')
      });
      return;
    }

    const cost = tokenCosts.url;
    if (tokenBalance < cost) {
      setStatus({
        type: 'error',
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
          url: url.trim(),
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name,
          category: textCategory
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.insufficientTokens) {
          setIsTokenPurchaseOpen(true);
        }
        throw new Error(data.error || t('failedToExtractUrl', 'Failed to extract recipe from URL.'));
      }

      await handlePostImportSuccess(data.recipe, data.consumedSystemTokens || cost, data.remainingBalance);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || t('networkError', 'Network error during URL import.') });
      setLoading(false);
    }
  };

  const handleTextImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    const cost = tokenCosts.text;
    if (tokenBalance < cost) {
      setStatus({
        type: 'error',
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
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.insufficientTokens) {
          setIsTokenPurchaseOpen(true);
        }
        throw new Error(data.error || t('failedToParseText', 'Failed to parse recipe text.'));
      }

      await handlePostImportSuccess(data.recipe, data.consumedSystemTokens || cost, data.remainingBalance);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || t('networkError', 'Network error during text import.') });
      setLoading(false);
    }
  };

  const handleFilesAdded = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) validFiles.push(files[i]);
    }
    if (validFiles.length === 0) return;
    const merged = [...selectedFiles, ...validFiles].slice(0, 5);
    setSelectedFiles(merged);
    setPreviewUrls(merged.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(updatedFiles);
    setPreviewUrls(previewUrls.filter((_, idx) => idx !== index));
  };

  const handleImageImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    const cost = tokenCosts.photo;
    if (tokenBalance < cost) {
      setStatus({
        type: 'error',
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

      let localPhotoPath = '/uploads/recipes/default.jpg';
      try {
        const uploadRes = await fetch('/api/recipes/upload', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData?.url) localPhotoPath = uploadData.url;
      } catch (_) {}

      const res = await fetch('/api/ai/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          image: localPhotoPath,
          title: primaryFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          category: textCategory,
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.insufficientTokens) {
          setIsTokenPurchaseOpen(true);
        }
        throw new Error(data.error || t('failedToProcessPhoto', 'Failed to process recipe image.'));
      }

      await handlePostImportSuccess(data.recipe, data.consumedSystemTokens || cost, data.remainingBalance);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || t('imageAnalysisFailed', 'Image analysis failed.') });
      setLoading(false);
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Header with Live Token Wallet & Synced AI Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Sparkles className="h-6 w-6" /> {t('importRecipeTitle', 'AI Recipe Importer')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('importRecipeSubtitle', 'Import recipes from websites, text notes, or photos and save directly to your recipe library.')}
          </p>
        </div>

        {/* Live Status & Wallet Widget */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            title="Active Model configured in /admin/ai-settings"
          >
            <Cpu className="h-3.5 w-3.5 text-orange-400" />
            <span className="font-mono">{activeAiModel}</span>
          </div>

          {strictDietEnforcement && (
            <div 
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
              title={`Strict Dietary Policy active with ${filterWordsList.length} filter terms.`}
            >
              <ShieldAlert className="h-3 w-3" />
              <span>{t('strictFiltersBadge', 'Strict Filters Active')}</span>
            </div>
          )}

          <div 
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-sm"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
          >
            <Coins className="h-4 w-4 text-amber-500" />
            <div className="text-xs font-mono font-black" style={{ color: 'var(--color-text)' }}>
              {tokenBalance} <span className="text-amber-500">{tokenSymbol}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsTokenPurchaseOpen(true)}
              className="ml-1 text-[10px] font-extrabold px-2 py-0.5 rounded-lg text-white transition hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {t('topUpBtn', 'Top Up')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div 
        className="rounded-3xl p-6 space-y-6 shadow-xl border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
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
            { id: 'url', label: t('urlTab', 'URL'), icon: Link2, cost: tokenCosts.url },
            { id: 'text', label: t('textTab', 'Text'), icon: FileText, cost: tokenCosts.text },
            { id: 'image', label: t('imageTab', 'Image'), icon: ImageIcon, cost: tokenCosts.photo },
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
                  color: 'var(--color-emerald)',
                  borderColor: 'var(--color-emerald)',
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
                  {tab.cost} {tokenSymbol}
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
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <strong>{t('dietNoticeTitle', 'AI Dietary Restrictions Enforced')}:</strong> {t('dietNoticeDesc', 'Recipes containing avoid terms')} ({filterWordsList.slice(0, 4).join(', ')}{filterWordsList.length > 4 ? '...' : ''}) {t('willBeBlocked', 'will be automatically blocked.')}
              </span>
            </div>
          </div>
        )}

        {/* TAB 1: URL IMPORT */}
        {activeTab === 'url' && (
          <form onSubmit={handleUrlImport} className="space-y-4">
            {!enableWebSearch && (
              <div 
                className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 text-amber-500"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
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
                required
                disabled={!enableWebSearch}
                placeholder={t('recipeWebUrlPlaceholder', 'https://www.recipetineats.com/... or food blog URL')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full border rounded-xl px-4 py-3.5 text-sm outline-none transition font-medium disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !url.trim() || !enableWebSearch}
              className="w-full text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading 
                ? t('downloadingPhotoParsingSteps', 'Parsing recipe & deducting tokens...') 
                : `${t('importRecipeBtn', 'Import Recipe')} (${tokenCosts.url} ${tokenSymbol})`}
            </button>
          </form>
        )}

        {/* TAB 2: TEXT IMPORT */}
        {activeTab === 'text' && (
          <form onSubmit={handleTextImport} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  {t('recipeTitleLabel', 'Recipe Title (Optional)')}
                </label>
                <input
                  type="text"
                  placeholder={t('recipeTitlePlaceholder', 'e.g. Homemade Apple Cake')}
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none"
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
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  {t('categoryLabel', 'Category (Recipe Type)')}
                </label>
                <select
                  value={textCategory}
                  onChange={(e) => setTextCategory(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  {recipeTypes.map(c => (
                    <option key={c} value={c} style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                      {c}
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
                required
                rows={7}
                placeholder={t('pasteRecipeContentPlaceholder', 'Paste ingredients and cooking steps here...')}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full border rounded-xl p-4 text-xs outline-none resize-none font-mono"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !rawText.trim()}
              className="w-full text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading 
                ? t('processingSavingRecipe', 'Processing & saving recipe...') 
                : `${t('saveAndImportRecipe', 'Save & Import Recipe')} (${tokenCosts.text} ${tokenSymbol})`}
            </button>
          </form>
        )}

        {/* TAB 3: IMAGE / PHOTO IMPORT */}
        {activeTab === 'image' && (
          <form onSubmit={handleImageImport} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                {t('recipeImagesMax5', 'Recipe Images (up to 5)')}
              </label>

              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition relative ${
                  isDragging ? 'border-emerald-400' : 'hover:border-emerald-400'
                }`}
                style={{
                  borderColor: isDragging ? 'var(--color-emerald)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-inner-dark)'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  multiple
                  onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3">
                  <Upload className="h-10 w-10 stroke-[2.2]" style={{ color: 'var(--color-emerald)' }} />
                </div>
                <p className="text-xs sm:text-sm font-semibold tracking-wide" style={{ color: 'var(--color-text)' }}>
                  <span style={{ color: 'var(--color-primary)' }} className="font-bold">
                    {t('clickToUpload', 'Click to upload')}
                  </span>{' '}
                  <span className="font-semibold" style={{ color: 'var(--color-emerald)' }}>
                    {t('orDragAndDrop', 'or drag and drop')}
                  </span>
                </p>
                <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--color-emerald)' }}>
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
                      className="relative h-24 rounded-xl overflow-hidden border group shadow"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-inner-dark)'
                      }}
                    >
                      <img src={previewUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black text-white rounded-full transition cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || selectedFiles.length === 0}
              className="w-full text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Upload className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading 
                ? t('aiSearchingRecipeImporting', 'AI OCR analyzing & importing...') 
                : `${t('importRecipeFromImages', 'Import Recipe from Images')} (${tokenCosts.photo} ${tokenSymbol})`}
            </button>
          </form>
        )}

        {/* Notifications & Status Banner */}
        {status && (
          <div
            className="p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in"
            style={status.type === 'success' ? {
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'var(--color-emerald)',
              color: 'var(--color-emerald)'
            } : status.type === 'warning' ? {
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'rgba(245, 158, 11, 0.5)',
              color: '#f59e0b'
            } : {
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#ef4444'
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

            {status.msg.toLowerCase().includes('insufficient') && (
              <button
                type="button"
                onClick={() => setIsTokenPurchaseOpen(true)}
                className="px-3 py-1 rounded-xl font-bold text-[11px] text-white shrink-0 cursor-pointer shadow-sm"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('buyTokensNowBtn', 'Buy Tokens')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Token Purchase Modal Component */}
      <TokenPurchaseModal
        isOpen={isTokenPurchaseOpen}
        onClose={() => setIsTokenPurchaseOpen(false)}
        userId={getCurrentUser()?.id}
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
