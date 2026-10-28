// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Languages, Globe, Plus, Search, Check, Trash2, Edit2, 
  RefreshCw, CheckCircle2, AlertCircle, Save, Undo2, ArrowRightLeft,
  Database, ShieldCheck, ChevronDown, Sparkles, X
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface SupportedLanguage {
  code: string;
  name: string;
  native: string;
  nativeName?: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  direction?: 'ltr' | 'rtl';
  status: 'active' | 'inactive';
  isDefault?: boolean;
}

interface CountryOption {
  name: string;
  code: string;
  flag: string;
}

const COMMON_COUNTRIES: CountryOption[] = [
  { name: 'United States', code: 'en', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'en', flag: '🇬🇧' },
  { name: 'Thailand', code: 'th', flag: '🇹🇭' },
  { name: 'Spain', code: 'es', flag: '🇪🇸' },
  { name: 'France', code: 'fr', flag: '🇫🇷' },
  { name: 'Germany', code: 'de', flag: '🇩🇪' },
  { name: 'Italy', code: 'it', flag: '🇮🇹' },
  { name: 'Japan', code: 'ja', flag: '🇯🇵' },
  { name: 'China', code: 'zh', flag: '🇨🇳' },
  { name: 'South Korea', code: 'ko', flag: '🇰🇷' },
  { name: 'Portugal', code: 'pt', flag: '🇵🇹' },
  { name: 'Brazil', code: 'pt', flag: '🇧🇷' },
  { name: 'Netherlands', code: 'nl', flag: '🇳🇱' },
  { name: 'India', code: 'hi', flag: '🇮🇳' },
  { name: 'Vietnam', code: 'vi', flag: '🇻🇳' },
  { name: 'Indonesia', code: 'id', flag: '🇮🇩' },
  { name: 'Turkey', code: 'tr', flag: '🇹🇷' },
  { name: 'Saudi Arabia', code: 'ar', flag: '🇸🇦' },
  { name: 'United Arab Emirates', code: 'ar', flag: '🇦🇪' },
  { name: 'Canada', code: 'en', flag: '🇨🇦' },
  { name: 'Australia', code: 'en', flag: '🇦🇺' },
  { name: 'Mexico', code: 'es', flag: '🇲🇽' },
  { name: 'Sweden', code: 'sv', flag: '🇸🇪' },
  { name: 'Norway', code: 'no', flag: '🇳🇴' },
  { name: 'Denmark', code: 'da', flag: '🇩🇰' },
  { name: 'Finland', code: 'fi', flag: '🇫🇮' },
  { name: 'Poland', code: 'pl', flag: '🇵🇱' },
  { name: 'Greece', code: 'el', flag: '🇬🇷' },
  { name: 'Russia', code: 'ru', flag: '🇷🇺' }
];

const DEFAULT_LOCALES: SupportedLanguage[] = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸', dir: 'ltr', status: 'active', isDefault: true },
  { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭', dir: 'ltr', status: 'active', isDefault: false },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', dir: 'ltr', status: 'active', isDefault: false },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', dir: 'ltr', status: 'active', isDefault: false }
];

export default function AdminLanguagePage() {
  const { t, locale: currentGlobalLocale, setLocale: setGlobalLocale } = useTranslation();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'languages' | 'words'>('languages');

  // Core Data States
  const [languages, setLanguages] = useState<SupportedLanguage[]>(DEFAULT_LOCALES);
  const [defaultLang, setDefaultLang] = useState<string>('en');
  const [dictionaries, setDictionaries] = useState<Record<string, Record<string, string>>>({});
  const [initialDictionaries, setInitialDictionaries] = useState<Record<string, Record<string, string>>>({});

  // System Words Tab States
  const [activeDictLang, setActiveDictLang] = useState<string>('en');
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI Interaction States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Language Modal States
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [editingLangCode, setEditingLangCode] = useState<string | null>(null);
  const [langForm, setLangForm] = useState<SupportedLanguage>({
    code: '',
    name: '',
    native: '',
    flag: '🌐',
    dir: 'ltr',
    status: 'active',
    isDefault: false
  });

  // Flag Picker Dropdown State
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [flagCountrySearch, setFlagCountrySearch] = useState('');

  // Word Modal States
  const [wordModalOpen, setWordModalOpen] = useState(false);
  const [newWordKey, setNewWordKey] = useState('');
  const [newWordValue, setNewWordValue] = useState('');

  const isSavingRef = useRef(false);

  // Compute dirty unsaved state for dictionaries
  const isDirty = useMemo(() => {
    return JSON.stringify(dictionaries) !== JSON.stringify(initialDictionaries);
  }, [dictionaries, initialDictionaries]);

  // Load language settings & system dictionaries from server API
  const loadData = useCallback(async () => {
    if (isSavingRef.current) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/languages?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.supportedLanguages) && data.supportedLanguages.length > 0) {
          const normalized = data.supportedLanguages.map((l: any) => ({
            ...l,
            native: l.native || l.nativeName || l.name,
            dir: l.dir || l.direction || 'ltr'
          }));
          setLanguages(normalized);
          const def = normalized.find((l: any) => l.isDefault)?.code || data.defaultLanguage || 'en';
          setDefaultLang(def);
        }
        if (data.translations && typeof data.translations === 'object') {
          setDictionaries(data.translations);
          setInitialDictionaries(JSON.parse(JSON.stringify(data.translations)));
        }
      }
    } catch (err) {
      console.warn('Notice loading /admin/language data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${t('langPageTitle', 'Language & Localization')} - Zecratary`;
    loadData();

    const handleExternalUpdates = () => {
      loadData();
    };

    window.addEventListener('zecratary_languages_updated', handleExternalUpdates);
    window.addEventListener('zecratary_dictionary_updated', handleExternalUpdates);
    window.addEventListener('zecratary_locale_changed', handleExternalUpdates);

    return () => {
      window.removeEventListener('zecratary_languages_updated', handleExternalUpdates);
      window.removeEventListener('zecratary_dictionary_updated', handleExternalUpdates);
      window.removeEventListener('zecratary_locale_changed', handleExternalUpdates);
    };
  }, [loadData, t]);

  // Synchronize activeDictLang if languages array updates
  useEffect(() => {
    if (languages.length > 0 && !languages.some(l => l.code === activeDictLang)) {
      setActiveDictLang(languages[0].code);
    }
  }, [languages, activeDictLang]);

  // Trigger reactive cross-component broadcast
  const broadcastUpdates = () => {
    window.dispatchEvent(new Event('zecratary_languages_updated'));
    window.dispatchEvent(new Event('zecratary_dictionary_updated'));
    window.dispatchEvent(new Event('zecratary_locale_changed'));
    window.dispatchEvent(new Event('zecratary_admin_settings_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  // Save Languages List and Settings to PostgreSQL and Server Store
  const persistLanguages = async (updatedLangs: SupportedLanguage[], defCode: string) => {
    isSavingRef.current = true;
    try {
      const res = await fetch('/api/admin/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportedLanguages: updatedLangs,
          defaultLanguage: defCode,
          translations: dictionaries
        })
      });

      if (!res.ok) throw new Error('Failed to persist language settings');

      setLanguages(updatedLangs);
      setDefaultLang(defCode);
      broadcastUpdates();

      setToast({
        type: 'success',
        message: t('langSavedToast', 'Languages and settings updated successfully!')
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || t('wordsSaveError', 'Failed to save system words. Please try again.')
      });
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 300);
    }
  };

  // Save Dictionaries to PostgreSQL and Server Store
  const handleSaveDictionaries = async () => {
    isSavingRef.current = true;
    setSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/admin/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportedLanguages: languages,
          defaultLanguage: defaultLang,
          translations: dictionaries
        })
      });

      if (!res.ok) throw new Error(t('wordsSaveError', 'Failed to save system words. Please try again.'));

      setInitialDictionaries(JSON.parse(JSON.stringify(dictionaries)));
      broadcastUpdates();

      setToast({
        type: 'success',
        message: t('wordsSavedToast', 'System words saved & broadcasted successfully!')
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || t('wordsSaveError', 'Failed to save system words. Please try again.')
      });
    } finally {
      setSaving(false);
      setTimeout(() => { isSavingRef.current = false; }, 300);
    }
  };

  // Discard dictionary edits
  const handleDiscardDictionaries = () => {
    setDictionaries(JSON.parse(JSON.stringify(initialDictionaries)));
    setToast(null);
  };

  // Toggle Language Status (Active / Inactive)
  const handleToggleStatus = (code: string) => {
    if (code === defaultLang) {
      setToast({
        type: 'error',
        message: t('cannotDeleteDefault', 'Cannot delete or deactivate the default language.')
      });
      return;
    }
    const updated = languages.map(l => {
      if (l.code === code) {
        const nextStatus: 'active' | 'inactive' = l.status === 'active' ? 'inactive' : 'active';
        return { ...l, status: nextStatus };
      }
      return l;
    });
    persistLanguages(updated, defaultLang);
  };

  // Set Language as Default
  const handleSetDefault = (code: string) => {
    const updated = languages.map(l => ({
      ...l,
      isDefault: l.code === code,
      status: l.code === code ? 'active' : l.status
    }));
    persistLanguages(updated, code);
  };

  // Delete Language
  const handleDeleteLanguage = (code: string) => {
    if (code === defaultLang) {
      setToast({
        type: 'error',
        message: t('cannotDeleteDefault', 'Cannot delete or deactivate the default language.')
      });
      return;
    }
    if (!window.confirm(t('deleteLangConfirm', 'Are you sure you want to delete this language?'))) return;

    const updated = languages.filter(l => l.code !== code);
    persistLanguages(updated, defaultLang);
  };

  // Open Language Modal for Add or Edit
  const openLangModal = (lang?: SupportedLanguage) => {
    setShowFlagPicker(false);
    setFlagCountrySearch('');
    if (lang) {
      setEditingLangCode(lang.code);
      setLangForm({ 
        ...lang,
        native: lang.native || lang.nativeName || lang.name,
        dir: lang.dir || lang.direction || 'ltr'
      });
    } else {
      setEditingLangCode(null);
      setLangForm({
        code: '',
        name: '',
        native: '',
        flag: '🌐',
        dir: 'ltr',
        status: 'active',
        isDefault: false
      });
    }
    setLangModalOpen(true);
  };

  // Submit Language Form (Add or Edit)
  const handleSaveLangForm = () => {
    const cleanCode = langForm.code.trim().toLowerCase();
    const cleanName = langForm.name.trim();
    const cleanNative = langForm.native.trim() || cleanName;
    const cleanFlag = langForm.flag.trim() || '🌐';

    if (!cleanCode || !cleanName) {
      alert(t('codeAndNameRequired', 'Language code and name are required.'));
      return;
    }

    let updated: SupportedLanguage[];
    if (editingLangCode) {
      updated = languages.map(l => l.code === editingLangCode ? {
        ...l,
        name: cleanName,
        native: cleanNative,
        nativeName: cleanNative,
        flag: cleanFlag,
        dir: langForm.dir,
        direction: langForm.dir,
        status: langForm.status
      } : l);
    } else {
      if (languages.some(l => l.code === cleanCode)) {
        alert(`"${cleanCode}" ${t('languageAlreadyExists', 'already exists.')}`);
        return;
      }
      const newLang: SupportedLanguage = {
        code: cleanCode,
        name: cleanName,
        native: cleanNative,
        nativeName: cleanNative,
        flag: cleanFlag,
        dir: langForm.dir,
        direction: langForm.dir,
        status: langForm.status,
        isDefault: false
      };
      updated = [...languages, newLang];

      if (!dictionaries[cleanCode]) {
        setDictionaries(prev => ({ ...prev, [cleanCode]: {} }));
      }
    }

    setLangModalOpen(false);
    persistLanguages(updated, defaultLang);
  };

  // Add System Phrase Modal Submit
  const handleAddWordSubmit = () => {
    const key = newWordKey.trim();
    const val = newWordValue.trim();
    if (!key) return;

    setDictionaries(prev => {
      const copy = { ...prev };
      languages.forEach(l => {
        copy[l.code] = {
          ...(copy[l.code] || {}),
          [key]: l.code === activeDictLang ? val : (copy[l.code]?.[key] || val)
        };
      });
      return copy;
    });

    setWordModalOpen(false);
    setNewWordKey('');
    setNewWordValue('');
  };

  // Delete System Phrase
  const handleDeleteWord = (keyToDelete: string) => {
    if (!window.confirm(t('deleteWordConfirm', 'Are you sure you want to delete this phrase?'))) return;

    setDictionaries(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(lCode => {
        if (copy[lCode]) {
          const dictCopy = { ...copy[lCode] };
          delete dictCopy[keyToDelete];
          copy[lCode] = dictCopy;
        }
      });
      return copy;
    });
  };

  // Filtered System Words for Active Dictionary
  const currentDict = dictionaries[activeDictLang] || {};
  const currentWordsList = useMemo(() => {
    const list = Object.entries(currentDict).map(([k, v]) => ({ key: k, value: String(v) }));
    if (!searchTerm.trim()) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter(item => 
      item.key.toLowerCase().includes(lower) || 
      item.value.toLowerCase().includes(lower)
    );
  }, [currentDict, searchTerm]);

  const filteredCountries = useMemo(() => {
    const q = flagCountrySearch.toLowerCase().trim();
    if (!q) return COMMON_COUNTRIES;
    return COMMON_COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.code.toLowerCase().includes(q) || 
      c.flag.includes(q)
    );
  }, [flagCountrySearch]);

  const activeLocalesCount = languages.filter(l => l.status === 'active').length;
  const totalWordsCount = Object.keys(currentDict).length;

  return (
    <div 
      className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6 pb-24 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header & System Badges */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Languages className="h-6 w-6 shrink-0" /> 
            <span>{t('langPageTitle', 'Language & Localization')}</span>
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {t('langPageSubtitle', 'Manage supported languages, default locale, and system translation dictionaries.')}
          </p>
        </div>

        {/* Telemetry Status Badges & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span>{t('fluidLayoutBadge', 'Full-Width Canvas')}</span>
          </div>

          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <Database className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald)' }} />
            <span>PostgreSQL Synchronized</span>
          </div>

          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)', 
              color: 'var(--color-text)' 
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span>{activeLocalesCount} {t('activeLanguagesBadge', 'Active Locales')}</span>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer shadow-sm"
            style={{ 
              backgroundColor: 'var(--color-inner-dark)', 
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
            title="Reload from server store"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Accessible Form-Free Region Container */}
      <div 
        role="region"
        data-lpignore="true"
        className="rounded-3xl p-6 space-y-6 shadow-xl border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Navigation Tabs Bar */}
        <div 
          className="flex p-1.5 rounded-2xl border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--color-inner-dark)',
            borderColor: 'var(--color-border)'
          }}
        >
          {[
            { id: 'languages', label: t('tabSupportedLanguages', 'Supported Languages'), icon: Globe, count: languages.length },
            { id: 'words', label: t('tabSystemWords', 'System Words & Translations'), icon: Languages, count: totalWordsCount }
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
                <tab.icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                  style={{ 
                    backgroundColor: isActive ? 'var(--color-inner-dark)' : 'transparent',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: SUPPORTED LANGUAGES */}
        {activeTab === 'languages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  {t('tabSupportedLanguages', 'Supported Languages')}
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Installed system locales and writing directions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => openLangModal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus className="h-4 w-4" />
                <span>{t('addLanguageBtn', 'Add Language')}</span>
              </button>
            </div>

            {/* Supported Languages Table */}
            <div 
              className="rounded-2xl border overflow-hidden shadow-sm transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                      <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colLanguage', 'Language & Identifier')}</th>
                      <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colCode', 'Code')}</th>
                      <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colNative', 'Native Name')}</th>
                      <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colDirection', 'Direction')}</th>
                      <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colStatus', 'Status')}</th>
                      <th className="py-3 px-4 font-bold text-right" style={{ color: 'var(--color-text)' }}>{t('colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {languages.map((lang) => {
                      const isDef = lang.isDefault || lang.code === defaultLang;
                      return (
                        <tr 
                          key={`lang-row-${lang.code}`} 
                          className="transition hover:opacity-90"
                          style={{ backgroundColor: 'transparent' }}
                        >
                          <td className="py-3 px-4 font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                            <span className="text-xl leading-none">{lang.flag || '🌐'}</span>
                            <span>{lang.name}</span>
                            {isDef && (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ml-1.5"
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-primary)',
                                  color: 'var(--color-primary)'
                                }}
                              >
                                {t('defaultBadge', 'Default')}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                            {lang.code}
                          </td>
                          <td className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>
                            {lang.native || lang.nativeName || lang.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {(lang.dir || lang.direction || 'ltr').toUpperCase()}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(lang.code)}
                              disabled={isDef}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                                isDef ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'
                              }`}
                              style={{
                                backgroundColor: lang.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                borderColor: lang.status === 'active' ? 'var(--color-emerald)' : 'rgba(239, 68, 68, 0.4)',
                                color: lang.status === 'active' ? 'var(--color-emerald)' : '#ef4444'
                              }}
                            >
                              {lang.status === 'active' ? t('statusActive', 'Active') : t('statusInactive', 'Inactive')}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isDef && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefault(lang.code)}
                                  className="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition hover:opacity-80 cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)'
                                  }}
                                >
                                  {t('setDefaultBtn', 'Set Default')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openLangModal(lang)}
                                className="p-1.5 rounded-lg border transition hover:opacity-80 cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--color-card)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text)'
                                }}
                                title={t('editLanguageBtn', 'Edit')}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {!isDef && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLanguage(lang.code)}
                                  className="p-1.5 rounded-lg border transition hover:opacity-80 text-red-400 cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderColor: 'rgba(239, 68, 68, 0.3)'
                                  }}
                                  title={t('deleteLanguageBtn', 'Delete')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SYSTEM WORDS & TRANSLATIONS */}
        {activeTab === 'words' && (
          <div className="space-y-4">
            {/* Action Bar: Language Selector, Search & Add Word */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  {t('selectLanguageLabel', 'Select Language to Edit:')}
                </label>
                <div className="flex items-center gap-1.5">
                  {languages.map((l) => {
                    const isSelected = activeDictLang === l.code;
                    return (
                      <button
                        key={`dict-selector-${l.code}`}
                        type="button"
                        onClick={() => setActiveDictLang(l.code)}
                        className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-inner-dark)',
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                          color: isSelected ? '#ffffff' : 'var(--color-text)'
                        }}
                      >
                        <span>{l.flag}</span>
                        <span>{l.name}</span>
                        <span className="font-mono text-[10px] uppercase opacity-75">({l.code})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('searchWordsPlaceholder', 'Search translation keys or phrases...')}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs outline-none transition"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setWordModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:opacity-90 cursor-pointer shadow-sm"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <Plus className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                  <span>{t('addWordBtn', 'Add Phrase')}</span>
                </button>
              </div>
            </div>

            {/* Unsaved Changes Banner */}
            {isDirty && (
              <div 
                className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in"
                style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                  color: '#f59e0b'
                }}
              >
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{t('unsavedNotice', 'You have unsaved dictionary modifications.')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscardDictionaries}
                    className="px-3 py-1 rounded-lg border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      color: 'var(--color-text)'
                    }}
                  >
                    {t('discardChangesBtn', 'Discard')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDictionaries}
                    disabled={saving}
                    className="px-3 py-1 rounded-lg text-xs font-bold text-white transition hover:opacity-90 cursor-pointer shadow"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {saving ? t('savingChanges', 'Saving...') : t('saveChangesBtn', 'Save Changes')}
                  </button>
                </div>
              </div>
            )}

            {/* System Words Table */}
            <div 
              className="rounded-2xl border overflow-hidden shadow-sm transition-colors duration-200"
              style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
            >
              <div className="max-h-[580px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
                    <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <th className="py-3 px-4 font-bold w-1/3" style={{ color: 'var(--color-text)' }}>{t('colKey', 'Translation Key')}</th>
                      <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colValue', 'Translated Text')}</th>
                      <th className="py-3 px-4 font-bold text-right w-16" style={{ color: 'var(--color-text)' }}>{t('colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {currentWordsList.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {t('noWordsFound', 'No matching system phrases found.')}
                        </td>
                      </tr>
                    ) : (
                      currentWordsList.map((item) => (
                        <tr 
                          key={`word-row-${activeDictLang}-${item.key}`} 
                          className="transition hover:opacity-95"
                          style={{ backgroundColor: 'transparent' }}
                        >
                          <td className="py-2.5 px-4 font-mono font-bold break-all select-all" style={{ color: 'var(--color-primary)' }}>
                            {item.key}
                          </td>
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              autoComplete="off"
                              data-lpignore="true"
                              data-form-type="other"
                              spellCheck="false"
                              value={item.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDictionaries(prev => ({
                                  ...prev,
                                  [activeDictLang]: {
                                    ...(prev[activeDictLang] || {}),
                                    [item.key]: val
                                  }
                                }));
                              }}
                              className="w-full border rounded-xl px-3 py-1.5 text-xs outline-none font-sans transition"
                              style={{
                                backgroundColor: 'var(--color-card)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)'
                              }}
                              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteWord(item.key)}
                              className="p-1.5 rounded-lg border transition hover:opacity-80 text-red-400 cursor-pointer"
                              style={{
                                backgroundColor: 'var(--color-card)',
                                borderColor: 'rgba(239, 68, 68, 0.3)'
                              }}
                              title={t('deleteLanguageBtn', 'Delete')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Status Notification Toast Banner */}
        {toast && (
          <div
            className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in"
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

        {/* Bottom Persistent Action Bar */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t" 
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            {t('totalWordsBadge', 'Total Phrases')}: <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>{totalWordsCount}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscardDictionaries}
                className="flex-1 sm:flex-none text-xs font-bold px-4 py-2.5 rounded-xl border transition hover:opacity-80 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {t('discardChangesBtn', 'Discard')}
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveDictionaries}
              disabled={saving || !isDirty}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                saving || !isDirty ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Check className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? t('savingChanges', 'Saving...') : t('saveChangesBtn', 'Save Changes')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT SUPPORTED LANGUAGE */}
      {langModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div 
            role="region"
            data-lpignore="true"
            className="w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 animate-in zoom-in-95"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Globe className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                <span>{editingLangCode ? t('modalEditLangTitle', 'Edit Supported Language') : t('modalAddLangTitle', 'Add Supported Language')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setLangModalOpen(false)}
                className="p-1 rounded-xl transition hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Flag Picker & Language Name */}
              <div className="flex gap-2.5 items-end">
                <div className="relative">
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('langFlagLabel', 'Flag')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFlagPicker(!showFlagPicker)}
                    className="w-16 h-[38px] border rounded-xl flex items-center justify-center gap-1 text-xl transition cursor-pointer shadow-sm hover:border-[var(--color-primary)]"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: showFlagPicker ? 'var(--color-primary)' : 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    title={t('flagPickerTitle', 'Select Flag')}
                  >
                    <span>{langForm.flag || '🌐'}</span>
                    <ChevronDown className="h-3 w-3 opacity-60 pointer-events-none" />
                  </button>

                  {/* Harmonized Searchable Flag Dropdown */}
                  {showFlagPicker && (
                    <div 
                      className="absolute top-full left-0 mt-1.5 w-72 p-3 border rounded-2xl space-y-2 shadow-2xl z-30 transition-colors duration-200 animate-in fade-in"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 pointer-events-none" style={{ color: 'var(--color-text-secondary)' }} />
                        <input
                          type="text"
                          data-lpignore="true"
                          data-form-type="other"
                          autoComplete="off"
                          spellCheck="false"
                          placeholder={t('searchCountryPlaceholder', 'Search country or ISO code...')}
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
                            key={`${c.name}-${c.flag}-${c.code}`}
                            type="button"
                            onClick={() => {
                              setLangForm({
                                ...langForm,
                                flag: c.flag,
                                code: editingLangCode ? langForm.code : (langForm.code || c.code),
                                name: langForm.name || c.name
                              });
                              setShowFlagPicker(false);
                              setFlagCountrySearch('');
                            }}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition text-xs cursor-pointer hover:opacity-80"
                            style={{
                              backgroundColor: 'var(--color-inner-dark)',
                              color: 'var(--color-text)'
                            }}
                          >
                            <span className="text-base leading-none">{c.flag}</span>
                            <span className="truncate text-[11px] font-medium">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('langNameLabel', 'Language Name (English)')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    placeholder="e.g. Japanese"
                    value={langForm.name}
                    onChange={(e) => setLangForm({ ...langForm, name: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-xs outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('langCodeLabel', 'Language Code')}
                  </label>
                  <input
                    type="text"
                    disabled={!!editingLangCode}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    placeholder="ja"
                    maxLength={5}
                    value={langForm.code}
                    onChange={(e) => setLangForm({ ...langForm, code: e.target.value.toLowerCase() })}
                    className="w-full border rounded-xl px-3 py-2 text-xs outline-none font-mono font-bold uppercase disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('langNativeLabel', 'Native Display Name')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    placeholder="日本語"
                    value={langForm.native}
                    onChange={(e) => setLangForm({ ...langForm, native: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-xs outline-none font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              {/* Harmonized Text Direction & Status Dropdowns with Custom Carets */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('langDirectionLabel', 'Text Direction')}
                  </label>
                  <div className="relative">
                    <select
                      value={langForm.dir}
                      onChange={(e) => setLangForm({ ...langForm, dir: e.target.value as 'ltr' | 'rtl' })}
                      className="w-full appearance-none rounded-xl border px-3.5 py-2 pr-9 text-xs font-bold outline-none cursor-pointer transition focus:ring-1 focus:ring-[var(--color-primary)] shadow-sm"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      <option value="ltr" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                        {t('dirLtr', 'Left-to-Right (LTR)')}
                      </option>
                      <option value="rtl" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                        {t('dirRtl', 'Right-to-Left (RTL)')}
                      </option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" style={{ color: 'var(--color-text)' }} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('statusLabel', 'Status')}
                  </label>
                  <div className="relative">
                    <select
                      value={langForm.status}
                      onChange={(e) => setLangForm({ ...langForm, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full appearance-none rounded-xl border px-3.5 py-2 pr-9 text-xs font-bold outline-none cursor-pointer transition focus:ring-1 focus:ring-[var(--color-primary)] shadow-sm"
                      style={{
                        backgroundColor: 'var(--color-inner-dark)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    >
                      <option value="active" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                        {t('statusActive', 'Active')}
                      </option>
                      <option value="inactive" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                        {t('statusInactive', 'Inactive')}
                      </option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" style={{ color: 'var(--color-text)' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setLangModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {t('cancelBtn', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveLangForm}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('confirmBtn', 'Save Language')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SYSTEM PHRASE */}
      {wordModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div 
            role="region"
            data-lpignore="true"
            className="w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 animate-in zoom-in-95"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Languages className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                <span>{t('modalAddWordTitle', 'Add System Phrase')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setWordModalOpen(false)}
                className="p-1 rounded-xl transition hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('keyNameLabel', 'Translation Key (camelCase)')}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder="e.g. checkoutSubmitButton"
                  value={newWordKey}
                  onChange={(e) => setNewWordKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className="w-full border rounded-xl px-3 py-2 text-xs outline-none font-mono font-bold"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('keyValueLabel', 'Translated Text')} ({activeDictLang.toUpperCase()})
                </label>
                <textarea
                  rows={3}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck="false"
                  placeholder="Enter translated text here..."
                  value={newWordValue}
                  onChange={(e) => setNewWordValue(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs outline-none font-sans"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setWordModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-inner-dark)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                {t('cancelBtn', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleAddWordSubmit}
                disabled={!newWordKey.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {t('addWordBtn', 'Add Phrase')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
