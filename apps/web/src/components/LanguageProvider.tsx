'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface SupportedLanguage {
  id?: string;
  code: string;
  name: string;
  flag?: string;
  direction?: 'ltr' | 'rtl';
  status?: string;
  is_default?: boolean;
  isDefault?: boolean;
}

export interface LanguageContextType {
  locale: string;
  currentLanguage?: string;
  language?: string;
  setLocale: (locale: string) => void;
  setLanguage?: (lang: string) => void;
  changeLanguage?: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  version: number;
  availableLanguages?: SupportedLanguage[];
  languages?: SupportedLanguage[];
  [key: string]: any;
}

export const DEFAULT_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { id: 'lang_en', code: 'en', name: 'English', flag: '🇺🇸', status: 'active', is_default: true },
  { id: 'lang_es', code: 'es', name: 'Español', flag: '🇪🇸', status: 'active', is_default: false },
  { id: 'lang_fr', code: 'fr', name: 'Français', flag: '🇫🇷', status: 'active', is_default: false },
  { id: 'lang_th', code: 'th', name: 'ภาษาไทย (Thai)', flag: '🇹🇭', status: 'active', is_default: false },
  { id: 'lang_de', code: 'de', name: 'Deutsch', flag: '🇩🇪', status: 'active', is_default: false },
  { id: 'lang_it', code: 'it', name: 'Italiano', flag: '🇮🇹', status: 'active', is_default: false },
  { id: 'lang_ja', code: 'ja', name: '日本語', flag: '🇯🇵', status: 'active', is_default: false },
  { id: 'lang_zh', code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳', status: 'active', is_default: false },
  { id: 'lang_ko', code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷', status: 'active', is_default: false },
];

// EXPORT LanguageContext so useTranslation hook and other consumers can import it cleanly
export const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  currentLanguage: 'en',
  language: 'en',
  setLocale: () => {},
  setLanguage: () => {},
  changeLanguage: () => {},
  t: (key, fallback) => fallback || key,
  version: 1,
  availableLanguages: DEFAULT_SUPPORTED_LANGUAGES,
  languages: DEFAULT_SUPPORTED_LANGUAGES,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLocale, setCurrentLocale] = useState('en');
  const [languagesList, setLanguagesList] = useState<SupportedLanguage[]>(DEFAULT_SUPPORTED_LANGUAGES);
  const [version, setVersion] = useState(1);

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/languages?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.languages) && data.languages.length > 0) {
          setLanguagesList(data.languages);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('zecratary_locale') || 'en' : 'en';
    setCurrentLocale(saved);
    fetchLanguages();

    const handleSync = () => fetchLanguages();
    window.addEventListener('zecratary_languages_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('zecratary_languages_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [fetchLanguages]);

  const handleSetLocale = (newLocale: string) => {
    setCurrentLocale(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zecratary_locale', newLocale);
      window.dispatchEvent(new CustomEvent('zecratary_locale_changed', { detail: { locale: newLocale } }));
    }
    setVersion(v => v + 1);
  };

  const t = (key: string, fallback?: string) => {
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{
      locale: currentLocale,
      currentLanguage: currentLocale,
      language: currentLocale,
      setLocale: handleSetLocale,
      setLanguage: handleSetLocale,
      changeLanguage: handleSetLocale,
      t,
      version,
      availableLanguages: languagesList,
      languages: languagesList,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

export default LanguageProvider;
