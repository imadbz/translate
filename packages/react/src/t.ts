export type TranslationValue = string | PluralForms;

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export type TranslationMap = Record<string, TranslationValue>;
export type AllTranslations = Record<string, TranslationMap>;

const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getPluralRules(locale: string): Intl.PluralRules {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRulesCache.set(locale, rules);
  }
  return rules;
}

export function resolveTranslation(
  translations: AllTranslations,
  locale: string,
  key: string,
  params?: Record<string, unknown>,
): string {
  // Try target locale, fall back to English, fall back to key
  const value = translations[locale]?.[key] ?? translations['en']?.[key];
  if (value === undefined) return key;

  let str: string;

  if (typeof value === 'string') {
    str = value;
  } else {
    // Plural object — resolve using Intl.PluralRules
    const count = params?.count;
    if (count !== undefined && typeof count === 'number') {
      const rules = getPluralRules(locale);
      const category = rules.select(count);
      str = value[category] ?? value.other;
    } else {
      str = value.other;
    }
  }

  if (!params) return str;

  // Replace {param} placeholders
  return str.replace(/\{(\w+)\}/g, (_, name) => {
    return params[name] !== undefined ? String(params[name]) : `{${name}}`;
  });
}
