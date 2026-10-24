'use client';

import { useContext } from 'react';
import { 
  LanguageContext, 
  LanguageProvider, 
  useTranslation as useOriginalTranslation 
} from '../components/LanguageProvider';

export { LanguageContext, LanguageProvider };
export type { LanguageContextType, SupportedLanguage } from '../components/LanguageProvider';

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  return ctx || useOriginalTranslation();
}

export default useTranslation;
