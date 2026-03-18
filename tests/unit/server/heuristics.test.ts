import { describe, it, expect } from 'vitest';
import {
  shouldTranslateString,
  isTranslatableAttribute,
  isSkipAttribute,
} from '@translate/server/extract/heuristics';

describe('shouldTranslateString', () => {
  describe('should translate', () => {
    it.each([
      'Pay now',
      'Submit',
      'Enter your email address',
      'Welcome back',
      'Are you sure you want to delete?',
      'Hello World',
      'Review your order before paying',
      'Sign in',
      'Your cart is empty',
      'Contact us for more information',
    ])('"%s" → true', (value) => {
      expect(shouldTranslateString(value)).toBe(true);
    });
  });

  describe('should NOT translate', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '   '],
      ['single character', 'x'],
      ['single punctuation', '.'],
      ['URL http', 'https://example.com'],
      ['URL relative', '/api/users'],
      ['URL hash', '#section'],
      ['URL mailto', 'mailto:test@example.com'],
      ['file path .js', 'utils/helper.js'],
      ['file path .png', 'images/logo.png'],
      ['file path .css', 'styles/main.css'],
      ['CSS px value', '16px'],
      ['CSS rem value', '1.5rem'],
      ['CSS hex color', '#ff0000'],
      ['CSS hex short', '#fff'],
      ['ALL_CAPS constant', 'LOADING'],
      ['ALL_CAPS multi', 'API_KEY'],
      ['camelCase', 'onClick'],
      ['camelCase long', 'handleSubmit'],
      ['Tailwind classes', 'flex items-center'],
      ['Tailwind complex', 'bg-blue-500 hover:bg-blue-700'],
      ['MIME type', 'application/json'],
      ['MIME image', 'image/png'],
    ])('%s: "%s" → false', (_desc, value) => {
      expect(shouldTranslateString(value)).toBe(false);
    });
  });
});

describe('isTranslatableAttribute', () => {
  it.each([
    'placeholder',
    'title',
    'alt',
    'aria-label',
    'aria-description',
    'aria-placeholder',
    'label',
  ])('"%s" → true', (attr) => {
    expect(isTranslatableAttribute(attr)).toBe(true);
  });

  it.each([
    'className',
    'href',
    'src',
    'id',
  ])('"%s" → false', (attr) => {
    expect(isTranslatableAttribute(attr)).toBe(false);
  });
});

describe('isSkipAttribute', () => {
  it.each([
    'className',
    'class',
    'id',
    'key',
    'ref',
    'style',
    'type',
    'name',
    'href',
    'src',
    'data-testid',
    'data-cy',
    'data-custom-thing',
    'onClick',
    'onChange',
    'onSubmit',
  ])('"%s" → true', (attr) => {
    expect(isSkipAttribute(attr)).toBe(true);
  });

  it.each([
    'placeholder',
    'title',
    'alt',
    'aria-label',
  ])('"%s" → false', (attr) => {
    expect(isSkipAttribute(attr)).toBe(false);
  });
});
