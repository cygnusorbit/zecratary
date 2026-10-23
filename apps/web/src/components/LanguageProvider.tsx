// Global Language Localization Provider
// GitHub: cygnusorbit/zecratary
'use client';

import React, { createContext, useContext, useState, useEffect, useTransition } from 'react';

export interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  locale: string;
  setLocale: (loc: string) => void;
  version: string | number;
  t: (key: string, fallback?: string) => string;
  translations: Record<string, string>;
  availableLanguages: Array<{ code: string; name: string; nativeName?: string; flag?: string }>;
  isLoaded: boolean;
  [key: string]: any;
}

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
];

export const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  locale: 'en',
  setLocale: () => {},
  version: '2.1.0',
  t: (key: string, fallback?: string) => fallback || key,
  translations: {},
  availableLanguages: DEFAULT_LANGUAGES,
  isLoaded: true,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [availableLanguages, setAvailableLanguages] = useState(DEFAULT_LANGUAGES);
  const [isLoaded, setIsLoaded] = useState<boolean>(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )zecratary_lang=([^;]*)/);
      const saved = match ? decodeURIComponent(match[1]) : (navigator.language?.split('-')[0] || 'en');
      setLanguageState(saved);

      fetch('/api/admin/language')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.languages && Array.isArray(data.languages) && data.languages.length > 0) {
            setAvailableLanguages(data.languages);
          }
          if (data?.translations && typeof data.translations === 'object') {
            setTranslations(data.translations);
          }
        })
        .catch(() => {});
    }
  }, []);

  const setLanguage = (newLang: string) => {
    startTransition(() => {
      setLanguageState(newLang);
      if (typeof window !== 'undefined') {
        document.cookie = `zecratary_lang=${encodeURIComponent(newLang)}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = newLang;
      }
    });
  };

  const t = (key: string, fallback?: string): string => {
    if (translations[key]) return translations[key];
    if (fallback !== undefined) return fallback;
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    locale: language,
    setLocale: setLanguage,
    version: '2.1.0',
    t,
    translations,
    availableLanguages,
    isLoaded,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      locale: 'en',
      setLocale: () => {},
      version: '2.1.0',
      t: (key: string, fallback?: string) => fallback || key,
      translations: {},
      availableLanguages: DEFAULT_LANGUAGES,
      isLoaded: true,
    };
  }
  return context;
}

export default LanguageProvider;
