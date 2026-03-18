import { createContext, useContext } from 'react';

export interface TranslateContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: string[];
  translations: Record<string, Record<string, string>>;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export const TranslateContext = createContext<TranslateContextValue | null>(null);

export function useTranslateContext(): TranslateContextValue {
  const ctx = useContext(TranslateContext);
  if (!ctx) {
    throw new Error('useTranslateContext must be used within a <TranslateProvider>');
  }
  return ctx;
}
