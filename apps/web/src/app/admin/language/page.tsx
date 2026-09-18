// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Globe, Languages, Plus, Edit3, Trash2, Shield, 
  Check, CheckCircle, X, AlertCircle, Search, 
  ShieldAlert, Star, Type, Sliders, RotateCcw, Flag, RefreshCw
} from 'lucide-react';
import { getCurrentUser, initAuthStorage } from '@/lib/auth';
import { useTranslation } from '@/components/LanguageProvider';
import { 
  getMergedDictionary, 
  saveCustomDictionary
} from '@/lib/i18n';
import { en } from '@/lib/lang/en';
import { es } from '@/lib/lang/es';
import { fr } from '@/lib/lang/fr';
import { th } from '@/lib/lang/th';
import { DEFAULT_DICTIONARIES } from '@/lib/lang';
import { 
  purgeLegacyBrowserAdminStorage, 
  fetchServerAdminSettings, 
  persistServerAdminSettings 
} from '@/lib/adminSync';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
  direction: 'ltr' | 'rtl';
  isDefault: boolean;
  status: 'active' | 'inactive';
  lastUpdated: string;
}

export interface CountryOption {
  name: string;
  code: string;
  flag: string;
}

export const COMMON_COUNTRIES: CountryOption[] = [
  { name: 'United States', code: 'en', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'en', flag: '🇬🇧' },
  { name: 'Spain', code: 'es', flag: '🇪🇸' },
  { name: 'France', code: 'fr', flag: '🇫🇷' },
  { name: 'Thailand', code: 'th', flag: '🇹🇭' },
  { name: 'Germany', code: 'de', flag: '🇩🇪' },
  { name: 'Italy', code: 'it', flag: '🇮🇹' },
  { name: 'Japan', code: 'ja', flag: '🇯🇵' },
  { name: 'China', code: 'zh', flag: '🇨🇳' },
  { name: 'South Korea', code: 'ko', flag: '🇰🇷' },
  { name: 'Portugal', code: 'pt', flag: '🇵🇹' },
  { name: 'Brazil', code: 'pt', flag: '🇧🇷' },
  { name: 'Russia', code: 'ru', flag: '🇷🇺' },
  { name: 'Saudi Arabia', code: 'ar', flag: '🇸🇦' },
  { name: 'Netherlands', code: 'nl', flag: '🇳🇱' },
  { name: 'India', code: 'hi', flag: '🇮🇳' },
  { name: 'Vietnam', code: 'vi', flag: '🇻🇳' },
  { name: 'Indonesia', code: 'id', flag: '🇮🇩' },
  { name: 'Turkey', code: 'tr', flag: '🇹🇷' },
  { name: 'Mexico', code: 'es', flag: '🇲🇽' },
  { name: 'Canada', code: 'en', flag: '🇨🇦' },
  { name: 'Australia', code: 'en', flag: '🇦🇺' },
  { name: 'Sweden', code: 'sv', flag: '🇸🇪' },
  { name: 'Norway', code: 'no', flag: '🇳🇴' },
  { name: 'Denmark', code: 'da', flag: '🇩🇰' },
  { name: 'Finland', code: 'fi', flag: '🇫🇮' },
  { name: 'Poland', code: 'pl', flag: '🇵🇱' },
  { name: 'Greece', code: 'el', flag: '🇬🇷' },
  { name: 'Egypt', code: 'ar', flag: '🇪🇬' },
  { name: 'Argentina', code: 'es', flag: '🇦🇷' },
  { name: 'Philippines', code: 'fil', flag: '🇵🇭' },
  { name: 'Malaysia', code: 'ms', flag: '🇲🇾' },
  { name: 'Singapore', code: 'en', flag: '🇸🇬' },
  { name: 'Switzerland', code: 'de', flag: '🇨🇭' },
  { name: 'Belgium', code: 'nl', flag: '🇧🇪' },
  { name: 'Austria', code: 'de', flag: '🇦🇹' },
  { name: 'Ireland', code: 'ga', flag: '🇮🇪' },
  { name: 'New Zealand', code: 'en', flag: '🇳🇿' },
  { name: 'South Africa', code: 'af', flag: '🇿🇦' },
  { name: 'United Arab Emirates', code: 'ar', flag: '🇦🇪' },
  { name: 'Israel', code: 'he', flag: '🇮🇱' },
  { name: 'Ukraine', code: 'uk', flag: '🇺🇦' },
  { name: 'Czech Republic', code: 'cs', flag: '🇨🇿' },
  { name: 'Hungary', code: 'hu', flag: '🇭🇺' },
  { name: 'Romania', code: 'ro', flag: '🇷🇴' },
  { name: 'Colombia', code: 'es', flag: '🇨🇴' },
  { name: 'Chile', code: 'es', flag: '🇨🇱' },
  { name: 'Peru', code: 'es', flag: '🇵🇪' },
  { name: 'Taiwan', code: 'zh', flag: '🇹🇼' },
  { name: 'Hong Kong', code: 'zh', flag: '🇭🇰' },
];

export const getLanguageFlag = (code?: string, explicitFlag?: string): string => {
  if (explicitFlag) return explicitFlag;
  if (!code) return '🌐';
  const c = code.toLowerCase().trim();
  const match = COMMON_COUNTRIES.find((item) => item.code.toLowerCase() === c);
  return match ? match.flag : '🌐';
};

export const DEFAULT_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', direction: 'ltr', isDefault: true, status: 'active', lastUpdated: new Date().toISOString() },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr', isDefault: false, status: 'active', lastUpdated: new Date().toISOString() },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr', isDefault: false, status: 'active', lastUpdated: new Date().toISOString() },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', direction: 'ltr', isDefault: false, status: 'active', lastUpdated: new Date().toISOString() },
];

export default function AdminLanguagePage() {
  const langContext = useTranslation();
  const t = langContext?.t || ((key: string, fallback?: string) => fallback || key);
  const version = langContext?.version;

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [search, setSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editActiveTab, setEditActiveTab] = useState<'settings' | 'words'>('settings');
  const [editingCode, setEditingCode] = useState<string | null>(null);

  // Form Fields
  const [langCode, setLangCode] = useState('');
  const [langName, setLangName] = useState('');
  const [langNativeName, setLangNativeName] = useState('');
  const [langFlag, setLangFlag] = useState('🇺🇸');
  const [langDirection, setLangDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [langStatus, setLangStatus] = useState<'active' | 'inactive'>('active');
  const [langIsDefault, setLangIsDefault] = useState(false);
  const [modalError, setModalError] = useState('');

  // Flag Picker Dropdown State
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [flagCountrySearch, setFlagCountrySearch] = useState('');

  // Editable System Words State
  const [wordsMap, setWordsMap] = useState<Record<string, string>>({});
  const [wordSearch, setWordSearch] = useState('');
  const [newWordKey, setNewWordKey] = useState('');
  const [newWordVal, setNewWordVal] = useState('');

  // Dynamic Theme Synchronization
  const applyGlobalTheme = useCallback(() => {
    try {
      window.dispatchEvent(new Event('zecratary_theme_updated'));
    } catch (_) {}
  }, []);

  useEffect(() => {
    applyGlobalTheme();
    window.addEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_changed', applyGlobalTheme);
    window.addEventListener('zecratary_theme_updated', applyGlobalTheme);
    window.addEventListener('storage', applyGlobalTheme);

    return () => {
      window.removeEventListener('zecratary_theme_mode_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_changed', applyGlobalTheme);
      window.removeEventListener('zecratary_theme_updated', applyGlobalTheme);
      window.removeEventListener('storage', applyGlobalTheme);
    };
  }, [applyGlobalTheme]);

  // Load languages exclusively from Server Storage (Zero LocalStorage)
  const loadLanguages = useCallback(async () => {
    setIsLoading(true);
    purgeLegacyBrowserAdminStorage();
    try {
      const serverData = await fetchServerAdminSettings();
      if (serverData && Array.isArray(serverData.supportedLanguages) && serverData.supportedLanguages.length > 0) {
        const withFlags = serverData.supportedLanguages.map((item: any) => ({
          ...item,
          flag: item.flag || getLanguageFlag(item.code)
        }));
        setLanguages(withFlags);
      } else {
        setLanguages(DEFAULT_LANGUAGES);
      }
    } catch (e) {
      console.error('[AdminLanguagePage] Failed to fetch server languages:', e);
      setLanguages(DEFAULT_LANGUAGES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('langPageTitle', 'Language Management')} - ${t('adminConsole', 'Admin Console')}`;
    initAuthStorage();
    const user = getCurrentUser();
    setCurrentUser(user);
    loadLanguages();

    const handleSync = () => loadLanguages();
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_admin_settings_updated', handleSync);

    return () => {
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_admin_settings_updated', handleSync);
    };
  }, [t, version, loadLanguages]);

  // Persist languages list directly to server (Zero LocalStorage writes)
  const saveLanguagesList = async (updated: SupportedLanguage[]) => {
    setLanguages(updated);
    await persistServerAdminSettings({ supportedLanguages: updated });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zecratary_languages_updated', { detail: updated }));
      window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // ADD LANGUAGE
  const handleOpenAddModal = () => {
    setLangCode('');
    setLangName('');
    setLangNativeName('');
    setLangFlag('🇺🇸');
    setLangDirection('ltr');
    setLangStatus('active');
    setLangIsDefault(false);
    setModalError('');
    setShowFlagPicker(false);
    setFlagCountrySearch('');
    setShowAddModal(true);
  };

  const handleAddLanguageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const cleanCode = langCode.trim().toLowerCase();
    const cleanName = langName.trim();
    const cleanNative = langNativeName.trim() || cleanName;

    if (!cleanCode || !cleanName) {
      setModalError(t('codeAndNameRequired', 'Language code and name are required.'));
      return;
    }

    if (languages.some((l) => l.code.toLowerCase() === cleanCode)) {
      setModalError(`"${cleanCode}" ${t('languageAlreadyExists', 'already exists.')}`);
      return;
    }

    let updated = [...languages];
    if (langIsDefault) {
      updated = updated.map((l) => ({ ...l, isDefault: false }));
    }

    const newLang: SupportedLanguage = {
      code: cleanCode,
      name: cleanName,
      nativeName: cleanNative,
      flag: langFlag || getLanguageFlag(cleanCode),
      direction: langDirection,
      isDefault: langIsDefault,
      status: langStatus,
      lastUpdated: new Date().toISOString()
    };

    const initialWords: Record<string, string> = {};
    Object.keys(en).forEach((k) => {
      initialWords[k] = (en as any)[k];
    });

    try {
      await fetch('/api/admin/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          name: cleanName,
          dictionary: initialWords
        })
      });
    } catch (err) {
      console.warn('API file sync notice:', err);
    }

    await saveLanguagesList([...updated, newLang]);
    try {
      saveCustomDictionary(cleanCode, initialWords);
    } catch (_) {}

    setShowAddModal(false);
    showToast(`"${cleanName}" (${cleanCode}.ts) ${t('languageAddedSuccess', 'added successfully!')}`);
  };

  const handleOpenEditModal = (lang: SupportedLanguage) => {
    setEditingCode(lang.code);
    setLangCode(lang.code);
    setLangName(lang.name);
    setLangNativeName(lang.nativeName);
    setLangFlag(lang.flag || getLanguageFlag(lang.code));
    setLangDirection(lang.direction);
    setLangStatus(lang.status);
    setLangIsDefault(lang.isDefault);
    setModalError('');
    setEditActiveTab('settings');
    setWordSearch('');
    setShowFlagPicker(false);
    setFlagCountrySearch('');

    const merged = getMergedDictionary(lang.code);
    const fullDictionary: Record<string, string> = {};
    Object.keys(en).forEach((k) => {
      fullDictionary[k] = merged[k] || (DEFAULT_DICTIONARIES as any)[lang.code]?.[k] || (en as any)[k] || '';
    });
    Object.keys(merged).forEach((k) => {
      if (fullDictionary[k] === undefined) {
        fullDictionary[k] = merged[k];
      }
    });

    setWordsMap(fullDictionary);
    setShowEditModal(true);
  };

  const handleWordChange = (key: string, value: string) => {
    setWordsMap((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddNewWordKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newWordKey.trim();
    if (!cleanKey) return;
    setWordsMap((prev) => ({
      ...prev,
      [cleanKey]: newWordVal.trim()
    }));
    setNewWordKey('');
    setNewWordVal('');
  };

  const handleResetWordsToDefault = () => {
    if (!editingCode) return;
    if (confirm(t('confirmResetWords', 'Reset all words for this language back to system defaults?'))) {
      const base = (DEFAULT_DICTIONARIES as any)[editingCode] || en;
      setWordsMap({ ...base });
    }
  };

  const handleEditLanguageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode) return;
    setModalError('');

    const cleanName = langName.trim();
    const cleanNative = langNativeName.trim() || cleanName;

    if (!cleanName) {
      setModalError(t('nameRequired', 'Language display name is required.'));
      return;
    }

    let updated = languages.map((l) => {
      if (l.code === editingCode) {
        return {
          ...l,
          name: cleanName,
          nativeName: cleanNative,
          flag: langFlag || getLanguageFlag(l.code),
          direction: langDirection,
          status: l.isDefault ? 'active' : langStatus,
          isDefault: langIsDefault,
          lastUpdated: new Date().toISOString()
        };
      }
      return langIsDefault ? { ...l, isDefault: false } : l;
    });

    await saveLanguagesList(updated);
    try {
      saveCustomDictionary(editingCode, wordsMap);
    } catch (_) {}

    try {
      await fetch('/api/admin/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editingCode,
          name: cleanName,
          dictionary: wordsMap
        })
      });
    } catch (_) {}

    setShowEditModal(false);
    showToast(`"${cleanName}" & ${editingCode}.ts updated successfully!`);
  };

  const handleDeleteLanguage = async (lang: SupportedLanguage) => {
    if (lang.isDefault) {
      showToast(t('cannotDeleteDefaultError', 'Default language cannot be deleted.'), 'error');
      return;
    }
    if (lang.code === 'en') {
      showToast(t('cannotDeleteEnglishError', 'Baseline English language cannot be deleted.'), 'error');
      return;
    }
    if (!confirm(`${t('confirmDelete', 'Are you sure you want to delete')} "${lang.name}" (${lang.code}) and remove ${lang.code}.ts library?`)) return;

    try {
      await fetch('/api/admin/languages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: lang.code })
      });
    } catch (err) {
      console.warn('API deletion sync notice:', err);
    }

    const updated = languages.filter((l) => l.code !== lang.code);
    await saveLanguagesList(updated);
    showToast(`"${lang.name}" (${lang.code}.ts) ${t('languageRemoved', 'removed successfully.')}`);
  };

  const handleSetDefault = async (code: string) => {
    const updated = languages.map((l) => ({
      ...l,
      isDefault: l.code === code,
      status: (l.code === code ? 'active' : l.status) as 'active' | 'inactive'
    }));
    await saveLanguagesList(updated);
    showToast(`${t('setAsDefaultSuccess', 'Default language set to')} ${code.toUpperCase()}`);
  };

  const filtered = languages.filter(
    (l) =>
      !search.trim() ||
      l.name.toLowerCase().includes(search.toLowerCase().trim()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase().trim()) ||
      l.code.toLowerCase().includes(search.toLowerCase().trim())
  );

  const wordKeysList = useMemo(() => {
    const query = wordSearch.toLowerCase().trim();
    return Object.keys(wordsMap).filter((k) => {
      if (!query) return true;
      const enVal = (en as any)[k] || '';
      const curVal = wordsMap[k] || '';
      return (
        k.toLowerCase().includes(query) ||
        enVal.toLowerCase().includes(query) ||
        curVal.toLowerCase().includes(query)
      );
    });
  }, [wordsMap, wordSearch]);

  const filteredCountries = useMemo(() => {
    const q = flagCountrySearch.toLowerCase().trim();
    if (!q) return COMMON_COUNTRIES;
    return COMMON_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.flag.includes(q)
    );
  }, [flagCountrySearch]);

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4 pt-2 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* ACCESS WARNING */}
      {currentUser && currentUser.role !== 'admin' && (
        <div 
          className="p-4 rounded-2xl border flex items-center justify-between text-xs shadow-xs"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'rgba(217, 119, 6, 0.4)',
            color: '#fde68a'
          }}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
            <span>
              Signed in as <strong>{currentUser.email}</strong>. {t('adminPrivilegeWarning', 'Administrative privileges are required to modify languages.')}
            </span>
          </div>
          <Link 
            href="/login"
            className="px-3.5 py-1.5 text-white font-bold rounded-xl shrink-0 ml-3 shadow-sm"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {t('switchToAdmin', 'Switch to Admin')}
          </Link>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {feedbackMsg && (
        <div 
          className="p-3.5 border rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: feedbackType === 'success' ? 'var(--color-emerald)' : '#ef4444',
            color: feedbackType === 'success' ? 'var(--color-emerald)' : '#ef4444'
          }}
        >
          {feedbackType === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--color-emerald)' }} />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          )}
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 
            className="text-3xl font-black tracking-tight flex items-center gap-2.5"
            style={{ color: 'var(--color-primary)' }}
          >
            <Languages className="h-8 w-8" style={{ color: 'var(--color-primary)' }} /> {t('langPageTitle', 'Language Management')}
          </h1>
          <p 
            className="text-sm font-semibold"
            style={{ color: 'var(--color-emerald)' }}
          >
            {t('langPageSubtitle', 'Configure active system locales and in-app dictionaries')} ({languages.length} {t('installedSuffix', 'installed')})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadLanguages}
            disabled={isLoading}
            className="border font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title="Reload from server store"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary)' }} />
            <span>{t('refreshBtn', 'Reload')}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            disabled={currentUser?.role !== 'admin'}
            className="text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            <Plus className="h-4 w-4" /> {t('addLanguage', 'Add Language')}
          </button>
          <Link
            href="/admin"
            className="border font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <Shield className="h-4 w-4" style={{ color: 'var(--color-emerald)' }} /> {t('adminConsole', 'Admin Console')}
          </Link>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-4 top-3.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
        <input
          type="text"
          placeholder={t('searchLanguagePlaceholder', 'Search language by name, code or native script...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition shadow-xs"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)'
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        />
      </div>

      {/* LANGUAGES TABLE */}
      <div 
        className="border rounded-3xl overflow-hidden shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead 
              className="border-b uppercase font-bold text-[10px] tracking-wider transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <tr>
                <th className="px-5 py-4">{t('tableLangAndCode', 'Language & Identifier')}</th>
                <th className="px-5 py-4">{t('tableNativeName', 'Native Script & Flag')}</th>
                <th className="px-5 py-4">{t('tableDirection', 'Direction')}</th>
                <th className="px-5 py-4">{t('tableDefault', 'Default')}</th>
                <th className="px-5 py-4">{t('tableStatus', 'Status')}</th>
                <th className="px-5 py-4 text-right">{t('tableActions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('noLanguagesFound', 'No languages found matching')} "{search}"
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr 
                    key={item.code} 
                    className="transition"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-5 py-4 font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
                      <div 
                        className="w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shrink-0 uppercase shadow-xs"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-primary)'
                        }}
                      >
                        {item.code}
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{item.name}</div>
                        <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{item.code}.ts</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium" style={{ color: 'var(--color-text)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none select-none drop-shadow-sm" title={`${item.name} flag`}>
                          {item.flag || getLanguageFlag(item.code)}
                        </span>
                        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{item.nativeName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span 
                        className="border text-[10px] font-bold px-2 py-0.5 rounded uppercase shadow-xs"
                        style={{
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {item.direction}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {item.isDefault ? (
                        <span 
                          className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border inline-flex items-center gap-1 shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-emerald)',
                            color: 'var(--color-emerald)'
                          }}
                        >
                          <Star className="h-3 w-3 fill-current" /> {t('defaultBadge', 'Default')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(item.code)}
                          disabled={currentUser?.role !== 'admin'}
                          className="text-[10px] border px-2 py-1 rounded-lg transition cursor-pointer shadow-xs"
                          style={{
                            backgroundColor: 'var(--color-card)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          {t('setDefault', 'Set Default')}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span 
                        className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shadow-xs"
                        style={item.status === 'active' ? {
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-emerald)',
                          color: 'var(--color-emerald)'
                        } : {
                          backgroundColor: 'var(--color-inner-dark)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {item.status === 'active' ? t('active', 'Active') : t('inactive', 'Inactive')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          disabled={currentUser?.role !== 'admin'}
                          className="p-2 rounded-xl border transition shadow-xs cursor-pointer disabled:opacity-40"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                          title="Edit Language & Words"
                        >
                          <Edit3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLanguage(item)}
                          disabled={currentUser?.role !== 'admin' || item.isDefault || item.code === 'en'}
                          className="p-2 rounded-xl border transition shadow-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:text-red-500"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)'
                          }}
                          title={item.isDefault ? t('cannotDeleteDefault', 'Cannot delete default language') : t('deleteLanguageTooltip', 'Delete Language')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD LANGUAGE MODAL */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary)' }}
              >
                <Languages className="h-5 w-5" /> {t('addNewLanguageTitle', 'Add New Language')}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('addNewLanguageSub', 'Register a new locale code and initialize system translations.')}
              </p>
            </div>

            {modalError && (
              <div 
                className="p-3 rounded-xl font-semibold flex items-center gap-2 border shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#ef4444'
                }}
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddLanguageSubmit} className="space-y-4 pt-1">
              <div className="flex gap-3 items-start">
                <div className="relative">
                  <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Flag</label>
                  <button
                    type="button"
                    onClick={() => setShowFlagPicker(!showFlagPicker)}
                    className="w-14 h-[42px] border rounded-xl flex items-center justify-center text-2xl transition cursor-pointer shadow-sm hover:border-[var(--color-primary)]"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: showFlagPicker ? 'var(--color-primary)' : 'var(--color-border)'
                    }}
                    title="Select Country Flag"
                  >
                    {langFlag || '🌐'}
                  </button>

                  {showFlagPicker && (
                    <div 
                      className="absolute top-full left-0 mt-1.5 w-72 p-3 border rounded-2xl space-y-2 shadow-2xl z-30 transition-colors duration-200"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                        <input
                          type="text"
                          placeholder="Search country or code..."
                          value={flagCountrySearch}
                          onChange={(e) => setFlagCountrySearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs outline-none transition"
                          style={{
                            backgroundColor: 'var(--color-inner-dark)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto grid grid-cols-2 gap-1.5 pr-1">
                        {filteredCountries.map((c) => (
                          <button
                            key={`${c.name}-${c.flag}`}
                            type="button"
                            onClick={() => {
                              setLangFlag(c.flag);
                              if (!langCode) setLangCode(c.code);
                              setShowFlagPicker(false);
                              setFlagCountrySearch('');
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition text-xs cursor-pointer"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              color: 'var(--color-text)'
                            }}
                          >
                            <span className="text-lg leading-none">{c.flag}</span>
                            <span className="truncate">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('langCodeLabel', 'Language Code (ISO)')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('langCodePlaceholder', 'e.g. de, it, ja')}
                    maxLength={5}
                    value={langCode}
                    onChange={(e) => setLangCode(e.target.value)}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs uppercase font-mono outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('displayNameLabel', 'Display Name')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('displayNamePlaceholder', 'e.g. German')}
                  value={langName}
                  onChange={(e) => setLangName(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('nativeNameLabel', 'Native Name')}
                </label>
                <input
                  type="text"
                  placeholder={t('nativeNamePlaceholder', 'e.g. Deutsch')}
                  value={langNativeName}
                  onChange={(e) => setLangNativeName(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('layoutDirectionLabel', 'Layout Direction')}
                  </label>
                  <select
                    value={langDirection}
                    onChange={(e) => setLangDirection(e.target.value as any)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="ltr" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('directionLtr', 'Left-to-Right (LTR)')}</option>
                    <option value="rtl" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('directionRtl', 'Right-to-Left (RTL)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('statusLabel', 'Status')}
                  </label>
                  <select
                    value={langStatus}
                    onChange={(e) => setLangStatus(e.target.value as any)}
                    className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <option value="active" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('active', 'Active')}</option>
                    <option value="inactive" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('inactive', 'Inactive')}</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={langIsDefault}
                    onChange={(e) => setLangIsDefault(e.target.checked)}
                    className="rounded accent-[#E05638]"
                  />
                  <span>{t('setAsDefaultLabel', 'Set as default application language')}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus className="h-4 w-4" /> {t('addLanguage', 'Add Language')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LANGUAGE MODAL */}
      {showEditModal && (
        <div 
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="border rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative text-xs cursor-default flex flex-col max-h-[90vh] transition-colors duration-200"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--color-inner-dark)',
                color: 'var(--color-text)'
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h2 
                className="text-xl font-black flex items-center gap-2"
                style={{ color: 'var(--color-primary)' }}
              >
                <Edit3 className="h-5 w-5" /> {t('editLanguageTitle', 'Edit Language')} ({editingCode?.toUpperCase()})
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('editLanguageSub', 'Customize locale configuration and system dictionary phrases.')}
              </p>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex border-b gap-4 shrink-0 transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setEditActiveTab('settings')}
                className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                  editActiveTab === 'settings'
                    ? 'border-[var(--color-primary)]'
                    : 'border-transparent'
                }`}
                style={{
                  color: editActiveTab === 'settings' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                }}
              >
                <Sliders className="h-3.5 w-3.5" /> Language Configuration
              </button>
              <button
                type="button"
                onClick={() => setEditActiveTab('words')}
                className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                  editActiveTab === 'words'
                    ? 'border-[var(--color-primary)]'
                    : 'border-transparent'
                }`}
                style={{
                  color: editActiveTab === 'words' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                }}
              >
                <Type className="h-3.5 w-3.5" /> System Words & Translations ({Object.keys(wordsMap).length})
              </button>
            </div>

            {modalError && (
              <div 
                className="p-3 rounded-xl font-semibold flex items-center gap-2 border shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#ef4444'
                }}
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* TAB 1: SETTINGS */}
            {editActiveTab === 'settings' && (
              <div className="space-y-4 pt-1 overflow-y-auto pr-1">
                <div className="flex gap-3 items-start">
                  <div className="relative">
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Flag</label>
                    <button
                      type="button"
                      onClick={() => setShowFlagPicker(!showFlagPicker)}
                      className="w-14 h-[42px] border rounded-xl flex items-center justify-center text-2xl transition cursor-pointer shadow-sm hover:border-[var(--color-primary)]"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: showFlagPicker ? 'var(--color-primary)' : 'var(--color-border)'
                      }}
                      title="Change Country Flag"
                    >
                      {langFlag || '🌐'}
                    </button>

                    {showFlagPicker && (
                      <div 
                        className="absolute top-full left-0 mt-1.5 w-72 p-3 border rounded-2xl space-y-2 shadow-2xl z-30 transition-colors duration-200"
                        style={{
                          backgroundColor: 'var(--color-card)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <div className="relative">
                          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                          <input
                            type="text"
                            placeholder="Search country or code..."
                            value={flagCountrySearch}
                            onChange={(e) => setFlagCountrySearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs outline-none transition"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)'
                            }}
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto grid grid-cols-2 gap-1.5 pr-1">
                          {filteredCountries.map((c) => (
                            <button
                              key={`${c.name}-${c.flag}`}
                              type="button"
                              onClick={() => {
                                setLangFlag(c.flag);
                                setShowFlagPicker(false);
                                setFlagCountrySearch('');
                              }}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition text-xs cursor-pointer"
                              style={{
                                backgroundColor: 'var(--color-inner-dark)',
                                color: 'var(--color-text)'
                              }}
                            >
                              <span className="text-lg leading-none">{c.flag}</span>
                              <span className="truncate">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('displayNameLabel', 'Display Name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={langName}
                      onChange={(e) => setLangName(e.target.value)}
                      className="w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('nativeNameLabel', 'Native Name')}
                  </label>
                  <input
                    type="text"
                    value={langNativeName}
                    onChange={(e) => setLangNativeName(e.target.value)}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('layoutDirectionLabel', 'Layout Direction')}
                    </label>
                    <select
                      value={langDirection}
                      onChange={(e) => setLangDirection(e.target.value as any)}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      <option value="ltr" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('directionLtr', 'Left-to-Right (LTR)')}</option>
                      <option value="rtl" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('directionRtl', 'Right-to-Left (RTL)')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('statusLabel', 'Status')}
                    </label>
                    <select
                      value={langStatus}
                      onChange={(e) => setLangStatus(e.target.value as any)}
                      className="w-full border rounded-xl p-2.5 text-xs outline-none cursor-pointer transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      <option value="active" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('active', 'Active')}</option>
                      <option value="inactive" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>{t('inactive', 'Inactive')}</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={langIsDefault}
                      onChange={(e) => setLangIsDefault(e.target.checked)}
                      className="rounded accent-[#E05638]"
                    />
                    <span>{t('setAsDefaultLabel', 'Set as default application language')}</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: SYSTEM WORDS */}
            {editActiveTab === 'words' && (
              <div className="space-y-3 pt-1 flex-1 flex flex-col min-h-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                    <input
                      type="text"
                      placeholder="Filter words by translation key or English text..."
                      value={wordSearch}
                      onChange={(e) => setWordSearch(e.target.value)}
                      className="w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResetWordsToDefault}
                    className="px-3 py-2 border rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
                  </button>
                </div>

                <div 
                  className="p-3 border rounded-2xl flex flex-col sm:flex-row gap-2 items-center shrink-0 transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <input
                    type="text"
                    placeholder="New Key (e.g. welcomeBanner)"
                    value={newWordKey}
                    onChange={(e) => setNewWordKey(e.target.value)}
                    className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs outline-none font-mono transition"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <input
                    type="text"
                    placeholder={`Translation in ${langName}`}
                    value={newWordVal}
                    onChange={(e) => setNewWordVal(e.target.value)}
                    className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewWordKey}
                    className="px-3 py-1.5 text-white font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Phrase
                  </button>
                </div>

                <div 
                  className="flex-1 overflow-y-auto border rounded-2xl divide-y space-y-0.5 p-2 transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  {wordKeysList.length === 0 ? (
                    <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
                      No system phrases matching "{wordSearch}"
                    </div>
                  ) : (
                    wordKeysList.map((key) => {
                      const englishRef = (en as any)[key] || key;
                      const currentValue = wordsMap[key] ?? '';

                      return (
                        <div 
                          key={key} 
                          className="p-2.5 rounded-xl transition flex flex-col sm:flex-row items-start sm:items-center gap-3"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <div className="sm:w-1/3 shrink-0">
                            <div className="font-mono text-[11px] font-bold truncate" style={{ color: 'var(--color-text)' }} title={key}>
                              {key}
                            </div>
                            <div className="text-[10px] truncate" style={{ color: 'var(--color-text-secondary)' }} title={englishRef}>
                              EN: {englishRef}
                            </div>
                          </div>

                          <div className="w-full sm:flex-1">
                            <input
                              type="text"
                              value={currentValue}
                              placeholder={`Translate "${englishRef}"...`}
                              onChange={(e) => handleWordChange(key, e.target.value)}
                              className="w-full border rounded-xl px-3 py-2 text-xs outline-none transition"
                              style={{
                                backgroundColor: 'var(--color-card)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* MODAL FOOTER */}
            <div className="flex justify-end gap-2.5 pt-3 border-t shrink-0 transition-colors duration-200" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 border font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                onClick={handleEditLanguageSubmit}
                className="px-5 py-2.5 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5 text-xs cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Check className="h-4 w-4" /> {t('saveChanges', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
