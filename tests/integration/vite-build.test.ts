import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from 'vite';
import { resolve } from 'path';
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { startTestServer, stopTestServer } from '../helpers/test-server';
import translatePlugin from '@translate/vite-plugin';
import react from '@vitejs/plugin-react';

describe('Vite build integration', () => {
  let serverUrl: string;
  const fixtureRoot = resolve(__dirname, '../fixtures/simple-app');
  const translationsDir = resolve(fixtureRoot, 'translations');

  beforeAll(async () => {
    const info = await startTestServer();
    serverUrl = info.url;
  });

  afterAll(async () => {
    await stopTestServer();
    // Clean up generated translations dir
    rmSync(translationsDir, { recursive: true, force: true });
  });

  it('builds with English locale and writes en.json', async () => {
    const outDir = resolve(fixtureRoot, 'dist-en');

    await build({
      root: fixtureRoot,
      plugins: [
        translatePlugin({ serverUrl, locale: 'en' }),
        react(),
      ],
      build: { outDir, write: true, minify: false },
      logLevel: 'silent',
    });

    // Built JS should contain the original English strings
    const assetsDir = resolve(outDir, 'assets');
    expect(existsSync(assetsDir)).toBe(true);

    const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    const bundleContent = jsFiles
      .map(f => readFileSync(resolve(assetsDir, f), 'utf-8'))
      .join('\n');

    expect(bundleContent).toContain('Checkout');
    expect(bundleContent).toContain('Pay now');
    expect(bundleContent).not.toMatch(/\bt\(['"][a-z_]+\.[a-z_]+['"]\)/);

    // en.json should have been written to disk
    const enJsonPath = resolve(translationsDir, 'en.json');
    expect(existsSync(enJsonPath)).toBe(true);

    const enJson = JSON.parse(readFileSync(enJsonPath, 'utf-8'));
    expect(enJson).toHaveProperty('checkout_page.pay_now', 'Pay now');
    expect(enJson).toHaveProperty('checkout_page.checkout', 'Checkout');
  });

  it('builds with French locale using translations from disk', async () => {
    const outDir = resolve(fixtureRoot, 'dist-fr');

    // Write fr.json to disk (simulating what the GitHub Action would do)
    mkdirSync(translationsDir, { recursive: true });
    writeFileSync(resolve(translationsDir, 'fr.json'), JSON.stringify({
      'checkout_page.checkout': 'Paiement',
      'checkout_page.pay_now': 'Payer maintenant',
      'checkout_page.review_your_order_before_paying': 'Vérifiez votre commande',
    }));

    await build({
      root: fixtureRoot,
      plugins: [
        translatePlugin({ serverUrl, locale: 'fr' }),
        react(),
      ],
      build: { outDir, write: true, minify: false },
      logLevel: 'silent',
    });

    const assetsDir = resolve(outDir, 'assets');
    const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    const bundleContent = jsFiles
      .map(f => readFileSync(resolve(assetsDir, f), 'utf-8'))
      .join('\n');

    expect(bundleContent).toContain('Paiement');
    expect(bundleContent).toContain('Payer maintenant');
  });

  it('source files are unchanged after build', async () => {
    const sourceFiles = ['src/App.tsx', 'src/CheckoutPage.tsx', 'src/Profile.tsx', 'src/Nav.tsx'];

    const before = sourceFiles.map(f => ({
      path: f,
      content: readFileSync(resolve(fixtureRoot, f), 'utf-8'),
    }));

    await build({
      root: fixtureRoot,
      plugins: [
        translatePlugin({ serverUrl, locale: 'en' }),
        react(),
      ],
      build: {
        outDir: resolve(fixtureRoot, 'dist-check'),
        write: true,
        minify: false,
      },
      logLevel: 'silent',
    });

    const after = sourceFiles.map(f => ({
      path: f,
      content: readFileSync(resolve(fixtureRoot, f), 'utf-8'),
    }));

    for (let i = 0; i < before.length; i++) {
      expect(after[i].content).toBe(before[i].content);
    }
  });
});
