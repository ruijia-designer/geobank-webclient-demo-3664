import { createContext } from 'react';

export type Locale = 'zh' | 'en';
export type TranslationParams = Record<string, string | number>;
interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (source: string, params?: TranslationParams) => string;
}

export const interpolate = (text: string, params: TranslationParams = {}) => text.replace(/\{(\w+)\}/g,
  (match, key: string) => params[key] === undefined ? match : String(params[key]));

// Keep the context identity stable when Vite refreshes a dictionary or provider.
export const LanguageContext = createContext<LanguageState>({locale: 'zh', setLocale: () => {}, toggleLocale: () => {}, t: interpolate});
