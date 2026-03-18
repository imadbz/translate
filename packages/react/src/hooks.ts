import { useTranslateContext } from './context.js';

/**
 * Access the current locale and switch languages.
 *
 * ```tsx
 * const { locale, setLocale, availableLocales } = useLocale();
 * ```
 */
export function useLocale() {
  const { locale, setLocale, availableLocales } = useTranslateContext();
  return { locale, setLocale, availableLocales };
}

/**
 * Get the translation function for the current locale.
 *
 * ```tsx
 * const t = useTranslation();
 * return <p>{t('greeting', { name: 'Alice' })}</p>;
 * ```
 */
export function useTranslation() {
  const { t } = useTranslateContext();
  return t;
}
