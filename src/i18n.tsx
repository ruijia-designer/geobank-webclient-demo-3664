import { useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import commonEnglish from './locales/common.en';
import mapEnglish from './locales/map.en';
import baselineEnglish from './locales/baseline.en';
import resultsEnglish from './locales/results.en';
import searchEnglish from './locales/search.en';
import approvalEnglish from './locales/approval.en';
import { LanguageContext, interpolate } from './locales/context';
import type { Locale, TranslationParams } from './locales/context';
export type { Locale } from './locales/context';

const LANGUAGE_KEY = 'geobank-demo-locale';
const english: Record<string, string> = {...commonEnglish, ...mapEnglish, ...baselineEnglish, ...resultsEnglish, ...searchEnglish, ...approvalEnglish};

export function LanguageProvider({children}: {children: ReactNode}) {
  const [locale, setLocale] = useState<Locale>(() => {
    try { return sessionStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'zh'; } catch { return 'zh'; }
  });
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = locale === 'zh' ? '物探数据银行' : 'Geophysical Data Bank';
    try { sessionStorage.setItem(LANGUAGE_KEY, locale); } catch { /* Language switching also works without storage. */ }
  }, [locale]);
  const value = useMemo(() => ({locale, setLocale, toggleLocale: () => setLocale(current => current === 'zh' ? 'en' : 'zh'),
    t: (source: string, params?: TranslationParams) => interpolate(locale === 'en' ? english[source] ?? source : source, params)}), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useTranslation = () => useContext(LanguageContext);
