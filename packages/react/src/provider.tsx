import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { TranslateContext, type TranslateContextValue } from './context.js';
import { resolveTranslation } from './t.js';

const STORAGE_KEY = 'translate_locale';

function getStoredLocale(): string | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function storeLocale(locale: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage full or blocked — ignore
  }
}

function getBrowserLocales(): string[] {
  if (typeof navigator === 'undefined') return [];
  // navigator.languages is the full Accept-Language list in preference order
  return [...(navigator.languages ?? [navigator.language])];
}

function matchLocale(
  browserLocales: string[],
  available: string[],
): string | undefined {
  for (const bl of browserLocales) {
    // Exact match: "fr-FR" in available
    if (available.includes(bl)) return bl;
    // Base match: "fr-FR" → "fr"
    const base = bl.split('-')[0];
    if (available.includes(base)) return base;
  }
  return undefined;
}

export interface TranslateProviderProps {
  /** All translation maps keyed by locale: { en: {...}, fr: {...} } */
  translations: Record<string, Record<string, string>>;
  /** Fallback locale (default: "en") */
  defaultLocale?: string;
  children: ReactNode;
}

export function TranslateProvider({
  translations,
  defaultLocale = 'en',
  children,
}: TranslateProviderProps) {
  const availableLocales = useMemo(
    () => Object.keys(translations),
    [translations],
  );

  const [locale, setLocaleState] = useState(() => {
    // 1. Explicit user choice (localStorage)
    const stored = getStoredLocale();
    if (stored && translations[stored]) return stored;

    // 2. Browser language preference (navigator.languages / Accept-Language)
    const browserMatch = matchLocale(getBrowserLocales(), availableLocales);
    if (browserMatch) return browserMatch;

    // 3. Fallback
    return defaultLocale;
  });

  const setLocale = useCallback((newLocale: string) => {
    if (translations[newLocale]) {
      setLocaleState(newLocale);
      storeLocale(newLocale);
    } else {
      console.warn(`[translate] Locale "${newLocale}" not available. Available: ${availableLocales.join(', ')}`);
    }
  }, [translations, availableLocales]);

  const t = useCallback(
    (key: string, params?: Record<string, unknown>) =>
      resolveTranslation(translations, locale, key, params),
    [translations, locale],
  );

  const value: TranslateContextValue = useMemo(
    () => ({ locale, setLocale, availableLocales, translations, t }),
    [locale, setLocale, availableLocales, translations, t],
  );

  return (
    <TranslateContext value={value}>
      {children}
    </TranslateContext>
  );
}
