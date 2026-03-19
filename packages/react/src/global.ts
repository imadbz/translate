/**
 * Global translation store for use outside React components.
 * Used by extracted strings in objects, arrays, constants, etc.
 *
 * The TranslateProvider sets this when it mounts.
 * Outside components, call __tGlobal("key") which resolves
 * at render time (not at definition time).
 */

let globalTranslations: Record<string, Record<string, string>> = {};
let globalLocale = 'en';
const listeners = new Set<() => void>();

export function __setGlobalTranslations(
  translations: Record<string, Record<string, string>>,
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
  const str = globalTranslations[globalLocale]?.[key]
    ?? globalTranslations['en']?.[key]
    ?? key;
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, name) => {
    return params[name] !== undefined ? String(params[name]) : `{${name}}`;
  });
}
