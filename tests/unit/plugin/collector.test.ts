import { describe, it, expect } from 'vitest';
import { collectFiles } from '@translate/vite-plugin/collector';
import { resolve } from 'path';

const fixtureRoot = resolve(__dirname, '../../fixtures/simple-app');

describe('collectFiles', () => {
  it('collects .tsx files from the fixture app', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.path.endsWith('.tsx'))).toBe(true);
  });

  it('returns relative paths', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    expect(files.every(f => f.path.startsWith('src/'))).toBe(true);
  });

  it('includes file content', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    const checkout = files.find(f => f.path.includes('CheckoutPage'));
    expect(checkout).toBeDefined();
    expect(checkout!.content).toContain('Checkout');
    expect(checkout!.content).toContain('Pay now');
  });

  it('respects exclude patterns', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], ['**/App.tsx']);
    expect(files.find(f => f.path.includes('App.tsx'))).toBeUndefined();
  });

  it('returns empty array for non-matching patterns', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.vue'], []);
    expect(files).toHaveLength(0);
  });

  it('collects files sorted by path', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    const paths = files.map(f => f.path);
    expect(paths).toEqual([...paths].sort());
  });
});
