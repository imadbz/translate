import { createContext, useContext } from 'react';

export interface TranslateContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: string[];
  translations: Record<string, Record<string, string>>;
  t: (key: string, params?: Record<string, unknown>) => string;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
}

const fallback: TranslateContextValue = {
  locale: 'en',
  setLocale: (locale: string) => {
    console.warn(`[translate] Language switching is not available in dev mode. Attempted to switch to "${locale}".`);
  },
  availableLocales: ['en'],
  translations: {},
  t: (key: string) => key,
  dir: 'ltr',
  isRTL: false,
};

export const TranslateContext = createContext<TranslateContextValue | null>(null);

export function useTranslateContext(): TranslateContextValue {
  const ctx = useContext(TranslateContext);
  if (!ctx) return fallback;
  return ctx;
}
