import { describe, it, expect } from 'vitest';
import { generateKey, filePathToScope, textToSlug, KeyRegistry } from '@translate/server/transform/keygen';

describe('filePathToScope', () => {
  it('strips src/ prefix and extension', () => {
    expect(filePathToScope('src/CheckoutPage.tsx')).toBe('checkout_page');
  });

  it('handles nested paths', () => {
    expect(filePathToScope('src/pages/settings/Profile.tsx')).toBe('pages.settings.profile');
  });

  it('handles index files', () => {
    expect(filePathToScope('src/components/Button/index.tsx')).toBe('components.button');
  });

  it('handles .jsx extension', () => {
    expect(filePathToScope('src/App.jsx')).toBe('app');
  });

  it('handles paths without src/', () => {
    expect(filePathToScope('components/Nav.tsx')).toBe('components.nav');
  });
});

describe('textToSlug', () => {
  it('creates slug from simple text', () => {
    expect(textToSlug('Pay now')).toBe('pay_now');
  });

  it('creates slug from longer text', () => {
    expect(textToSlug('Review your order before paying')).toBe('review_your_order_before_paying');
  });

  it('limits to 6 words', () => {
    expect(textToSlug('This is a very long sentence that goes on')).toBe('this_is_a_very_long_sentence');
  });

  it('strips special characters', () => {
    expect(textToSlug('Hello, World!')).toBe('hello_world');
  });

  it('handles interpolation placeholders', () => {
    expect(textToSlug('Hello {name}')).toBe('hello_name');
  });

  it('truncates long slugs with hash', () => {
    const longText = 'This is an incredibly extraordinarily remarkably long piece of text that will exceed the limit';
    const slug = textToSlug(longText);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug).toMatch(/_[a-f0-9]{6}$/);
  });
});

describe('generateKey', () => {
  it('combines file scope and text slug', () => {
    expect(generateKey('src/CheckoutPage.tsx', 'Pay now')).toBe('checkout_page.pay_now');
  });

  it('handles nested paths', () => {
    expect(generateKey('src/pages/Home.tsx', 'Welcome back')).toBe('pages.home.welcome_back');
  });
});

describe('KeyRegistry', () => {
  it('registers and returns keys', () => {
    const registry = new KeyRegistry();
    const key = registry.register('src/App.tsx', 'Hello');
    expect(key).toBe('app.hello');
  });

  it('returns same key for same value', () => {
    const registry = new KeyRegistry();
    const key1 = registry.register('src/App.tsx', 'Hello');
    const key2 = registry.register('src/App.tsx', 'Hello');
    expect(key1).toBe(key2);
  });

  it('resolves collisions with suffix', () => {
    const registry = new KeyRegistry();
    const key1 = registry.register('src/App.tsx', 'Hello');
    // Different text that would produce same key (very unlikely but test the mechanism)
    // Force collision by using same file + same slug
    const key2 = registry.register('src/App.tsx', 'Hello!');
    expect(key1).not.toBe(key2);
    expect(key2).toMatch(/_2$/);
  });

  it('clears registry', () => {
    const registry = new KeyRegistry();
    registry.register('src/App.tsx', 'Hello');
    registry.clear();
    const key = registry.register('src/App.tsx', 'Hello');
    expect(key).toBe('app.hello');
  });
});
