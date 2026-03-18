import { describe, it, expect } from 'vitest';
import { resolveTranslation } from '@translate/react';

const translations = {
  en: {
    'home.hello': 'Hello',
    'home.greeting': 'Hello {name}',
    'home.items': 'You have {count} items',
  },
  fr: {
    'home.hello': 'Bonjour',
    'home.greeting': 'Bonjour {name}',
    'home.items': 'Vous avez {count} articles',
  },
};

describe('resolveTranslation', () => {
  it('resolves from target locale', () => {
    expect(resolveTranslation(translations, 'fr', 'home.hello')).toBe('Bonjour');
  });

  it('resolves from English locale', () => {
    expect(resolveTranslation(translations, 'en', 'home.hello')).toBe('Hello');
  });

  it('falls back to English when key missing in target locale', () => {
    const partial = { en: { 'key': 'English' }, fr: {} };
    expect(resolveTranslation(partial, 'fr', 'key')).toBe('English');
  });

  it('falls back to key when missing from all locales', () => {
    expect(resolveTranslation(translations, 'fr', 'missing.key')).toBe('missing.key');
  });

  it('interpolates params', () => {
    expect(resolveTranslation(translations, 'en', 'home.greeting', { name: 'Alice' }))
      .toBe('Hello Alice');
  });

  it('interpolates params in target locale', () => {
    expect(resolveTranslation(translations, 'fr', 'home.greeting', { name: 'Alice' }))
      .toBe('Bonjour Alice');
  });

  it('interpolates multiple params', () => {
    expect(resolveTranslation(translations, 'fr', 'home.items', { count: 3 }))
      .toBe('Vous avez 3 articles');
  });

  it('preserves placeholder when param not provided', () => {
    expect(resolveTranslation(translations, 'en', 'home.greeting'))
      .toBe('Hello {name}');
  });

  it('handles unknown locale by falling back to English', () => {
    expect(resolveTranslation(translations, 'de', 'home.hello')).toBe('Hello');
  });
});
