'use client';

import { en } from './lang/en';
import { es } from './lang/es';
import { fr } from './lang/fr';
import { th } from './lang/th';
import { DEFAULT_DICTIONARIES } from './lang';

export { en, es, fr, th, DEFAULT_DICTIONARIES };

export type LocaleCode = string;

export const dictionaries = DEFAULT_DICTIONARIES;

export const getCustomDictionaries = (): Record<string, Record<string, string>> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('zecratary_custom_dictionaries');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
};

export const getMergedDictionary = (locale: string): Record<string, string> => {
  const base = DEFAULT_DICTIONARIES[locale] || DEFAULT_DICTIONARIES['en'] || {};
  const customs = getCustomDictionaries();
  const customLocale = customs[locale] || {};
  return { ...base, ...customLocale };
};

export const saveCustomDictionary = (locale: string, words: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  const current = getCustomDictionaries();
  current[locale] = words;
  localStorage.setItem('zecratary_custom_dictionaries', JSON.stringify(current));
  window.dispatchEvent(new Event('zecratary_dictionaries_updated'));
  window.dispatchEvent(new Event('storage'));
};

export const getStoredLocale = (): string => {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem('zecratary_locale');
    if (saved) return saved;

    const langs = localStorage.getItem('zecratary_languages');
    if (langs) {
      const parsed = JSON.parse(langs);
      if (Array.isArray(parsed)) {
        const def = parsed.find((l: any) => l.isDefault && l.status === 'active');
        if (def && def.code) return def.code;
      }
    }
  } catch (_) {}
  return 'en';
};

export const setStoredLocale = (locale: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('zecratary_locale', locale);
  window.dispatchEvent(new CustomEvent('zecratary_locale_changed', { detail: locale }));
  window.dispatchEvent(new Event('storage'));
};
