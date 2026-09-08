'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  DEFAULT_DICTIONARIES, 
  getMergedDictionary, 
  getStoredLocale, 
  setStoredLocale as saveStoredLocale 
} from '@/lib/i18n';

interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string) => string;
  version: number;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string, fallback?: string) => {
    const en = DEFAULT_DICTIONARIES['en'] || {};
    return en[key] || fallback || key;
  },
  version: 0,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>('en');
  const [dict, setDict] = useState<Record<string, string>>(() => {
    return DEFAULT_DICTIONARIES['en'] || {};
  });
  const [version, setVersion] = useState<number>(0);

  useEffect(() => {
    const activeLocale = getStoredLocale();
    setLocaleState(activeLocale);
    setDict(getMergedDictionary(activeLocale));

    const handleLocaleChange = () => {
      const updatedLocale = getStoredLocale();
      setLocaleState(updatedLocale);
      setDict(getMergedDictionary(updatedLocale));
      setVersion((v) => v + 1);
    };

    window.addEventListener('zecratary_locale_changed', handleLocaleChange);
    window.addEventListener('zecratary_dictionaries_updated', handleLocaleChange);
    window.addEventListener('storage', handleLocaleChange);

    return () => {
      window.removeEventListener('zecratary_locale_changed', handleLocaleChange);
      window.removeEventListener('zecratary_dictionaries_updated', handleLocaleChange);
      window.removeEventListener('storage', handleLocaleChange);
    };
  }, []);

  const setLocale = (newLocale: string) => {
    saveStoredLocale(newLocale);
    setLocaleState(newLocale);
    setDict(getMergedDictionary(newLocale));
    setVersion((v) => v + 1);
  };

  const t = useCallback((key: string, fallback?: string): string => {
    if (dict && dict[key]) return dict[key];
    const enDict = DEFAULT_DICTIONARIES['en'] || {};
    if (enDict[key]) return enDict[key];
    return fallback || key;
  }, [dict]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, version }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
