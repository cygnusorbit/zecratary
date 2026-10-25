'use client';
// @ts-nocheck

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Languages, Globe, Plus, Search, Check, Trash2, Edit2, 
  RefreshCw, CheckCircle2, AlertCircle, Save, Undo2, ArrowRightLeft,
  Database, ShieldCheck
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface SupportedLanguage {
  code: string;
  name: string;
  native: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  status: 'active' | 'inactive';
  isDefault?: boolean;
}

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
          setLanguages(data.supportedLanguages);
          const def = data.supportedLanguages.find((l: any) => l.isDefault)?.code || data.defaultLanguage || 'en';
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
    if (lang) {
      setEditingLangCode(lang.code);
      setLangForm({ ...lang });
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

    if (!cleanCode || !cleanName) return;

    let updated: SupportedLanguage[];
    if (editingLangCode) {
      updated = languages.map(l => l.code === editingLangCode ? {
        ...l,
        name: cleanName,
        native: cleanNative,
        flag: cleanFlag,
        dir: langForm.dir,
        status: langForm.status
      } : l);
    } else {
      if (languages.some(l => l.code === cleanCode)) {
        alert('Language code already exists!');
        return;
      }
      const newLang: SupportedLanguage = {
        code: cleanCode,
        name: cleanName,
        native: cleanNative,
        flag: cleanFlag,
        dir: langForm.dir,
        status: langForm.status,
        isDefault: false
      };
      updated = [...languages, newLang];

      // Initialize empty dictionary if missing
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
      // Inject to current dictionary and ensure fallback across others
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

  const activeLocalesCount = languages.filter(l => l.status === 'active').length;
  const totalWordsCount = Object.keys(currentDict).length;

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header & System Badges */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Languages className="h-6 w-6" /> {t('langPageTitle', 'Language & Localization')}
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
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Accessible Form-Free Region Container (Constraint 9) */}
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
                <tab.icon className="h-4 w-4" />
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
                      <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>{t('colLanguage', 'Language')}</th>
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
                            <span className="text-xl">{lang.flag || '🌐'}</span>
                            <span>{lang.name}</span>
                            {isDef && (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
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
                            {lang.native || lang.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {lang.dir?.toUpperCase() || 'LTR'}
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
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-secondary)' }} />
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
                  <AlertCircle className="h-4 w-4" />
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
              <div className="max-h-[550px] overflow-y-auto">
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
            <h3 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Globe className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              {editingLangCode ? t('modalEditLangTitle', 'Edit Supported Language') : t('modalAddLangTitle', 'Add Supported Language')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
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
                    onChange={(e) => setLangForm({ ...langForm, code: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-xs outline-none font-mono font-bold uppercase disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                    {t('langFlagLabel', 'Flag Emoji')}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck="false"
                    placeholder="🇯🇵"
                    maxLength={4}
                    value={langForm.flag}
                    onChange={(e) => setLangForm({ ...langForm, flag: e.target.value })}
                    className="w-full border rounded-xl px-3 py-2 text-xs text-center outline-none text-base font-bold"
                    style={{
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
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

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                  {t('langDirectionLabel', 'Text Direction')}
                </label>
                <select
                  value={langForm.dir}
                  onChange={(e) => setLangForm({ ...langForm, dir: e.target.value as 'ltr' | 'rtl' })}
                  className="w-full border rounded-xl px-3 py-2 text-xs outline-none font-bold cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-inner-dark)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value="ltr">{t('dirLtr', 'Left-to-Right (LTR)')}</option>
                  <option value="rtl">{t('dirRtl', 'Right-to-Left (RTL)')}</option>
                </select>
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
            <h3 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Languages className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              {t('modalAddWordTitle', 'Add System Phrase')}
            </h3>

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
