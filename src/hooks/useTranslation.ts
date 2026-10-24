// Unified hook re-export for useTranslation
import { useTranslation as useBaseTranslation } from '@/components/LanguageProvider';

export const useTranslation = useBaseTranslation;
export default useBaseTranslation;
export { LanguageContext, LanguageProvider } from '@/components/LanguageProvider';
export type { LanguageContextType, SupportedLanguage } from '@/components/LanguageProvider';
