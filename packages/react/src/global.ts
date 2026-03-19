import { resolveTranslation, type AllTranslations } from './t.js';

let globalTranslations: AllTranslations = {};
let globalLocale = 'en';
const listeners = new Set<() => void>();

export function __setGlobalTranslations(
  translations: AllTranslations,
  locale: string,
) {
  globalTranslations = translations;
  globalLocale = locale;
  for (const listener of listeners) listener();
}

export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key: string, params?: Record<string, unknown>): string {
  return resolveTranslation(globalTranslations, globalLocale, key, params);
}
