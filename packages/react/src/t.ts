export function resolveTranslation(
  translations: Record<string, Record<string, string>>,
  locale: string,
  key: string,
  params?: Record<string, unknown>,
): string {
  // Try target locale, fall back to English, fall back to key
  const str = translations[locale]?.[key] ?? translations['en']?.[key] ?? key;

  if (!params) return str;

  // Replace {param} placeholders
  return str.replace(/\{(\w+)\}/g, (_, name) => {
    return params[name] !== undefined ? String(params[name]) : `{${name}}`;
  });
}
