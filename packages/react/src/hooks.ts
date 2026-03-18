import { useTranslateContext } from './context.js';

/**
 * Access the current locale and switch languages.
 *
 * ```tsx
 * const { locale, setLocale, availableLocales, dir, isRTL } = useLocale();
 * ```
 */
export function useLocale() {
  const { locale, setLocale, availableLocales, dir, isRTL } = useTranslateContext();
  return { locale, setLocale, availableLocales, dir, isRTL };
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

/**
 * Get the current text direction.
 *
 * ```tsx
 * const { dir, isRTL } = useDirection();
 * return <div style={{ textAlign: isRTL ? 'right' : 'left' }}>...</div>;
 * ```
 */
export function useDirection() {
  const { dir, isRTL } = useTranslateContext();
  return { dir, isRTL };
}
