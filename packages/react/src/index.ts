export { TranslateProvider, type TranslateProviderProps } from './provider.js';
export { useLocale, useTranslation, useDirection } from './hooks.js';
export { resolveTranslation, type TranslationValue, type PluralForms, type TranslationMap, type AllTranslations } from './t.js';
export { TranslateContext, type TranslateContextValue } from './context.js';
// Global t() kept for edge cases (non-component contexts like route configs)
// but should be avoided — prefer __t() inside components for reactivity
export { t, onLocaleChange } from './global.js';
