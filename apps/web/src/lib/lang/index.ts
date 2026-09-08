export { en } from './en';
export { es } from './es';
export { fr } from './fr';
export { ko } from './ko';
export { th } from './th';
export { zh } from './zh';

import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { ko } from './ko';
import { th } from './th';
import { zh } from './zh';

export const DEFAULT_DICTIONARIES: Record<string, Record<string, string>> = {
  en,
  es,
  fr,
  ko,
  th,
  zh,
};

export const dictionaries = DEFAULT_DICTIONARIES;
export default DEFAULT_DICTIONARIES;
