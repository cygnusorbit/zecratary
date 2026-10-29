// @ts-nocheck
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Globe, Plus, Edit2, Trash2, Check, RefreshCw, 
  Search, CheckCircle2, AlertCircle, ShieldAlert,
  ArrowRightLeft, Sparkles, Database, FileText
} from 'lucide-react';
import { useTranslation } from '@/components/LanguageProvider';

interface LanguageItem {
  id: string;
  code: string;
  name: string;
  native: string;
  nativeName?: string;
  flag: string;
  direction: 'ltr' | 'rtl';
  status: 'active' | 'inactive';
  is_default: boolean;
  isDefault?: boolean;
}

export default function AdminLanguagePage() {
  const { t, locale, setLocale } = useTranslation();
  const [activeTab, setActiveTab] = useState<'languages' | 'words'>('languages');
  
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Translation words filter & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWordLocale, setSelectedWordLocale] = useState('en');

  // Language Edit / Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingLang, setEditingLang] = useState<LanguageItem>({
    id: '',
    code: '',
    name: '',
    native: '',
    flag: '🌐',
    direction: 'ltr',
    status: 'active',
    is_default: false
  });

  // Translation Word Add Modal
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  // Fetch languages & dictionary from API
  const fetchLanguageData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/languages?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const rawLangs = data.supportedLanguages || data.languages || [];
        
        // Defensive normalization for string-or-object languages
        const cleanLangs: LanguageItem[] = rawLangs.map((l: any, idx: number) => {
          if (typeof l === 'string') {
            return {
              id: `lang_${l}`,
              code: l.toLowerCase(),
              name: l.toUpperCase(),
              native: l.toUpperCase(),
              flag: '🌐',
              direction: 'ltr',
              status: 'active',
              is_default: l.toLowerCase() === 'en'
            };
          }
          return {
            id: l.id || `lang_${l.code || idx}`,
            code: (l.code || '').toLowerCase(),
            name: l.name || (l.code || '').toUpperCase(),
            native: l.native || l.nativeName || l.name || '',
            flag: l.flag || '🌐',
            direction: l.direction || 'ltr',
            status: l.status === 'active' ? 'active' : 'inactive',
            is_default: Boolean(l.is_default ?? l.isDefault)
          };
        });

        setLanguages(cleanLangs);
        if (data.translations && typeof data.translations === 'object') {
          setTranslations(data.translations);
        }
        if (data.defaultLanguage) {
          setDefaultLanguage(data.defaultLanguage);
        }
      }
    } catch (err: any) {
      console.warn('Notice loading language data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLanguageData();

    const handleSync = () => fetchLanguageData();
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('zecratary_dictionary_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('zecratary_dictionary_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchLanguageData]);

  const activeCount = useMemo(() => {
    return languages.filter(l => l.status === 'active').length;
  }, [languages]);

  // Total unique phrases across all dictionaries
  const allPhraseKeys = useMemo(() => {
    const keys = new Set<string>();
    Object.values(translations).forEach(dict => {
      if (dict && typeof dict === 'object') {
        Object.keys(dict).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [translations]);

  // Filtered phrase keys for search
  const filteredPhraseKeys = useMemo(() => {
    if (!searchQuery.trim()) return allPhraseKeys;
    const q = searchQuery.toLowerCase();
    return allPhraseKeys.filter(k => {
      if (k.toLowerCase().includes(q)) return true;
      const val = translations[selectedWordLocale]?.[k] || '';
      return val.toLowerCase().includes(q);
    });
  }, [allPhraseKeys, searchQuery, translations, selectedWordLocale]);

  // Save changes to API & PostgreSQL
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setStatus(null);

      const res = await fetch('/api/admin/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportedLanguages: languages,
          translations,
          defaultLanguage
        })
      });

      if (!res.ok) throw new Error('Failed to save language settings.');

      window.dispatchEvent(new Event('zecratary_languages_updated'));
      window.dispatchEvent(new Event('zecratary_dictionary_updated'));
      window.dispatchEvent(new Event('storage'));

      setStatus({ type: 'success', msg: t('settingsSavedToast', 'Language settings saved & broadcasted successfully!') });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Error saving changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (code: string) => {
    setLanguages(prev => prev.map(l => {
      if (l.code === code) {
        if (l.is_default) return l; // Default locale must remain active
        return { ...l, status: l.status === 'active' ? 'inactive' : 'active' };
      }
      return l;
    }));
  };

  const handleSetDefault = (code: string) => {
    setDefaultLanguage(code);
    setLanguages(prev => prev.map(l => ({
      ...l,
      is_default: l.code === code,
      isDefault: l.code === code,
      status: l.code === code ? 'active' : l.status
    })));
  };

  const handleDeleteLanguage = (code: string) => {
    const target = languages.find(l => l.code === code);
    if (target?.is_default) {
      alert('Cannot delete the default system language.');
      return;
    }
    setLanguages(prev => prev.filter(l => l.code !== code));
  };

  const handleSaveLanguageModal = () => {
    if (!editingLang.code.trim() || !editingLang.name.trim()) {
      alert('Language code and name are required.');
      return;
    }

    if (modalMode === 'add') {
      const code = editingLang.code.trim().toLowerCase();
      if (languages.some(l => l.code === code)) {
        alert('A language with this code already exists.');
        return;
      }
      setLanguages(prev => [...prev, {
        ...editingLang,
        id: `lang_${code}`,
        code,
        native: editingLang.native || editingLang.name
      }]);
    } else {
      setLanguages(prev => prev.map(l => l.code === editingLang.code ? { ...editingLang } : l));
    }

    setIsModalOpen(false);
  };

  const handleAddTranslationWord = () => {
    if (!newKey.trim()) return;
    const key = newKey.trim();
    setTranslations(prev => {
      const updated = { ...prev };
      if (!updated[selectedWordLocale]) updated[selectedWordLocale] = {};
      updated[selectedWordLocale][key] = newVal.trim() || key;
      return updated;
    });
    setNewKey('');
    setNewVal('');
    setIsWordModalOpen(false);
  };

  return (
    <div 
      className="max-w-6xl mx-auto space-y-6 pb-24 px-4 font-sans transition-colors duration-200"
      style={{ color: 'var(--color-text)' }}
    >
      {/* Top Header & Telemetry Badges */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" 
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            <Globe className="h-6 w-6" /> {t('adminLanguageTitle', 'Language & Localization')}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('adminLanguageSubtitle', 'Manage supported languages, default locale, and system translation dictionaries.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span>Full-Width Canvas</span>
          </div>

          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Database className="h-3.5 w-3.5" style={{ color: 'var(--color-emerald, #10b981)' }} />
            <span>PostgreSQL Synchronized</span>
          </div>

          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span>{activeCount} Active Locales</span>
          </div>

          <button
            type="button"
            onClick={fetchLanguageData}
            className="p-2 rounded-xl border transition hover:opacity-80 cursor-pointer shadow-sm"
            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            title="Reload languages"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Accessible Form-Free Container (Constraint 9) */}
      <div 
        role="region"
        data-lpignore="true"
        className="rounded-3xl p-6 space-y-6 shadow-xl border transition-colors duration-200"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        {/* Navigation Tabs Bar */}
        <div 
          className="flex p-1.5 rounded-2xl border transition-colors duration-200"
          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('languages')}
            className="flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            style={activeTab === 'languages' ? {
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              borderWidth: '1px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            } : { color: 'var(--color-text-secondary)' }}
          >
            <Globe className="h-4 w-4" />
            <span>Supported Languages</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'rgba(224, 86, 56, 0.15)', color: 'var(--color-primary)' }}>
              {languages.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('words')}
            className="flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            style={activeTab === 'words' ? {
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              borderWidth: '1px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            } : { color: 'var(--color-text-secondary)' }}
          >
            <FileText className="h-4 w-4" />
            <span>System Words & Translations</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--color-text)' }}>
              {allPhraseKeys.length}
            </span>
          </button>
        </div>

        {/* TAB 1: SUPPORTED LANGUAGES TABLE */}
        {activeTab === 'languages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Installed System Locales</h3>
                <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Installed system locales and writing directions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalMode('add');
                  setEditingLang({
                    id: '',
                    code: '',
                    name: '',
                    native: '',
                    flag: '🌐',
                    direction: 'ltr',
                    status: 'active',
                    is_default: false
                  });
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition hover:opacity-90 shadow cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Language</span>
              </button>
            </div>

            {/* Language Table */}
            <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                    <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>Language & Identifier</th>
                    <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>Code</th>
                    <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>Native Name</th>
                    <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>Direction</th>
                    <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>Status</th>
                    <th className="py-3 px-4 font-bold text-right" style={{ color: 'var(--color-text)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {languages.map((item) => (
                    <tr 
                      key={item.code} 
                      className="transition hover:bg-white/[0.02]"
                      style={{ backgroundColor: 'var(--color-card)' }}
                    >
                      <td className="py-3.5 px-4 font-bold flex items-center gap-2.5">
                        <span className="text-xl">{item.flag || '🌐'}</span>
                        <span style={{ color: 'var(--color-text)' }}>{item.name}</span>
                        {item.is_default && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border"
                            style={{ 
                              backgroundColor: 'rgba(224, 86, 56, 0.15)', 
                              borderColor: 'var(--color-primary)', 
                              color: 'var(--color-primary)' 
                            }}
                          >
                            DEFAULT
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                        {item.code.toUpperCase()}
                      </td>

                      <td className="py-3.5 px-4 font-medium" style={{ color: 'var(--color-text)' }}>
                        {item.native || item.nativeName || item.name}
                      </td>

                      <td className="py-3.5 px-4 font-mono uppercase text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.direction || 'LTR'}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item.code)}
                          disabled={item.is_default}
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer disabled:opacity-50"
                          style={item.status === 'active' ? {
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            borderColor: '#10b981',
                            color: '#10b981'
                          } : {
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            borderColor: '#ef4444',
                            color: '#ef4444'
                          }}
                        >
                          {item.status === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1">
                        {!item.is_default && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(item.code)}
                            className="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition hover:opacity-80 cursor-pointer mr-1"
                            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          >
                            Set Default
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setModalMode('edit');
                            setEditingLang({ ...item });
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border transition hover:opacity-80 cursor-pointer inline-block"
                          style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          title="Edit Language"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {!item.is_default && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLanguage(item.code)}
                            className="p-1.5 rounded-lg border text-red-400 hover:text-red-300 transition cursor-pointer inline-block"
                            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                            title="Delete Language"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SYSTEM WORDS & TRANSLATIONS */}
        {activeTab === 'words' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="Search phrases or translation keys..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border text-xs outline-none font-medium"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              {/* Language Selector Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {languages.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setSelectedWordLocale(l.code)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    style={selectedWordLocale === l.code ? {
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                      borderColor: 'var(--color-primary)'
                    } : {
                      backgroundColor: 'var(--color-inner-dark)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                  >
                    <span>{l.flag}</span>
                    <span>{l.name}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsWordModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:opacity-90 cursor-pointer text-white shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Key</span>
                </button>
              </div>
            </div>

            {/* Translation Dictionary Table */}
            <div className="rounded-2xl border overflow-x-auto max-h-[550px] overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)' }}>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="py-3 px-4 font-bold w-1/3" style={{ color: 'var(--color-text)' }}>Translation Key Identifier</th>
                    <th className="py-3 px-4 font-bold" style={{ color: 'var(--color-text)' }}>
                      Phrase Translation ({languages.find(l => l.code === selectedWordLocale)?.name || selectedWordLocale.toUpperCase()})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {filteredPhraseKeys.slice(0, 250).map((key) => {
                    const currentVal = translations[selectedWordLocale]?.[key] || '';
                    return (
                      <tr key={key} className="hover:bg-white/[0.02]" style={{ backgroundColor: 'var(--color-card)' }}>
                        <td className="py-2.5 px-4 font-mono font-semibold" style={{ color: 'var(--color-primary)' }}>
                          {key}
                        </td>
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            autoComplete="off"
                            data-lpignore="true"
                            data-form-type="other"
                            value={currentVal}
                            placeholder={translations['en']?.[key] || key}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTranslations(prev => {
                                const next = { ...prev };
                                if (!next[selectedWordLocale]) next[selectedWordLocale] = {};
                                next[selectedWordLocale][key] = val;
                                return next;
                              });
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none transition"
                            style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredPhraseKeys.length > 250 && (
              <p className="text-[11px] text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Showing first 250 of {filteredPhraseKeys.length} matching phrases. Use search to filter specific keys.
              </p>
            )}
          </div>
        )}

        {/* Status Toast Banner */}
        {status && (
          <div
            className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in"
            style={{
              backgroundColor: 'var(--color-inner-dark)',
              borderColor: status.type === 'success' ? '#10b981' : 'rgba(239, 68, 68, 0.4)',
              color: status.type === 'success' ? '#10b981' : '#ef4444'
            }}
          >
            {status.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{status.msg}</span>
          </div>
        )}

        {/* Bottom Persistent Action Bar */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t" 
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Total Phrases: <span className="font-mono text-sm" style={{ color: 'var(--color-text)' }}>{allPhraseKeys.length}</span>
          </div>

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white shadow-lg transition hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Check className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* MODAL: ADD / EDIT LANGUAGE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            role="region"
            data-lpignore="true"
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
              {modalMode === 'add' ? 'Add Supported Language' : 'Edit Language Configuration'}
            </h3>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Language Code (e.g. en, th, es)</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  disabled={modalMode === 'edit'}
                  value={editingLang.code}
                  onChange={(e) => setEditingLang({ ...editingLang, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-mono"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Display Name (English)</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={editingLang.name}
                  onChange={(e) => setEditingLang({ ...editingLang, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Native Script (e.g. ไทย, Español)</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={editingLang.native}
                  onChange={(e) => setEditingLang({ ...editingLang, native: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Flag Emoji</label>
                  <input
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    maxLength={4}
                    value={editingLang.flag}
                    onChange={(e) => setEditingLang({ ...editingLang, flag: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-center text-base"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Direction</label>
                  <select
                    value={editingLang.direction}
                    onChange={(e) => setEditingLang({ ...editingLang, direction: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="ltr">LTR (Left to Right)</option>
                    <option value="rtl">RTL (Right to Left)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLanguageModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TRANSLATION KEY */}
      {isWordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            role="region"
            data-lpignore="true"
            className="w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Add New System Word Key</h3>
            
            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Translation Key Identifier</label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="e.g. welcomeHeaderSubtitle"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none font-mono"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Phrase Value for ({selectedWordLocale.toUpperCase()})
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="Enter localized text..."
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none"
                  style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setIsWordModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--color-inner-dark)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddTranslationWord}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Add Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
