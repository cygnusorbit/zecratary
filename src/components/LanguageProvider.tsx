// Generated / Updated by AI Collaborator - Zero localStorage writes, full PostgreSQL synchronization
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface LanguageContextType {
  locale: string;
  setLocale: (lang: string) => void;
  language?: string;
  currentLanguage?: string;
  availableLanguages?: string[];
  t: (key: string, fallback?: string) => string;
  version?: number;
  [key: string]: any;
}

export const DEFAULT_DICTIONARY: Record<string, string> = {
  ingredientCatTitle: 'Ingredient Categories',
  ingredientCatSubtitle: 'Manage custom ingredient categories and pantry classification',
  addNewCategory: 'Add New Ingredient Category',
  addCategoryBtn: 'Add Category',
  categoryPlaceholder: 'e.g. Spices, Grains, Produce...',
  activeCategories: 'Active Categories',
  reposition: 'Reposition',
  doneRepositioning: 'Done Repositioning',
  done: 'Done',
  save: 'Save',
  cancel: 'Cancel',
  resetDefaults: 'Reset Defaults',
  reload: 'Reload',
  adminConsole: 'Admin Console'
};

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  language: 'en',
  currentLanguage: 'en',
  availableLanguages: ['en', 'es', 'fr', 'de', 'th', 'zh', 'ja'],
  t: (key: string, fallback?: string) => fallback || DEFAULT_DICTIONARY[key] || key,
  version: 1
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>('en');
  const [dictionary, setDictionary] = useState<Record<string, string>>(DEFAULT_DICTIONARY);
  const [version, setVersion] = useState<number>(1);

  const fetchTranslations = useCallback(async (lang: string) => {
    try {
      const res = await fetch(`/api/admin/languages?lang=${encodeURIComponent(lang)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.translations && typeof data.translations === 'object') {
          setDictionary((prev) => ({ ...prev, ...data.translations }));
          setVersion((v) => v + 1);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchTranslations(locale);
  }, [locale, fetchTranslations]);

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    fetchTranslations(newLocale);
  };

  const t = (key: string, fallback?: string): string => {
    return dictionary[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        language: locale,
        currentLanguage: locale,
        availableLanguages: ['en', 'es', 'fr', 'de', 'th', 'zh', 'ja'],
        t,
        version
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      locale: 'en',
      setLocale: () => {},
      language: 'en',
      currentLanguage: 'en',
      availableLanguages: ['en', 'es', 'fr', 'de', 'th', 'zh', 'ja'],
      t: (key: string, fallback?: string) => fallback || DEFAULT_DICTIONARY[key] || key,
      version: 1
    };
  }
  return context;
}

export default LanguageProvider;
