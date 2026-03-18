import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from 'vite';
import { resolve } from 'path';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { startTestServer, stopTestServer } from '../helpers/test-server';
import translatePlugin from '@translate/vite-plugin';
import react from '@vitejs/plugin-react';

describe('Vite build integration', () => {
  let serverUrl: string;
  const fixtureRoot = resolve(__dirname, '../fixtures/simple-app');

  beforeAll(async () => {
    const info = await startTestServer();
    serverUrl = info.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('builds with English locale (identity transform)', async () => {
    const outDir = resolve(fixtureRoot, 'dist-en');

    await build({
      root: fixtureRoot,
      plugins: [
        translatePlugin({
          serverUrl,
          locale: 'en',
        }),
        react(),
      ],
      build: {
        outDir,
        write: true,
        minify: false,
      },
      logLevel: 'silent',
    });

    // Find the built JS file
    const assetsDir = resolve(outDir, 'assets');
    expect(existsSync(assetsDir)).toBe(true);

    const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);

    const bundleContent = jsFiles
      .map(f => readFileSync(resolve(assetsDir, f), 'utf-8'))
      .join('\n');

    // English build should contain the original strings
    expect(bundleContent).toContain('Checkout');
    expect(bundleContent).toContain('Pay now');

    // Should NOT contain any t() calls or translation keys
    expect(bundleContent).not.toMatch(/\bt\(['"][a-z_]+\.[a-z_]+['"]\)/);
  });

  it('builds with French locale (translated strings)', async () => {
    const outDir = resolve(fixtureRoot, 'dist-fr');

    await build({
      root: fixtureRoot,
      plugins: [
        translatePlugin({
          serverUrl,
          locale: 'fr',
          translations: {
            'checkout_page.checkout': 'Paiement',
            'checkout_page.pay_now': 'Payer maintenant',
            'checkout_page.review_your_order_before_paying': 'Vérifiez votre commande',
          },
        }),
        react(),
      ],
      build: {
        outDir,
        write: true,
        minify: false,
      },
      logLevel: 'silent',
    });

    const assetsDir = resolve(outDir, 'assets');
    const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    const bundleContent = jsFiles
      .map(f => readFileSync(resolve(assetsDir, f), 'utf-8'))
      .join('\n');

    // Should contain French strings
    expect(bundleContent).toContain('Paiement');
    expect(bundleContent).toContain('Payer maintenant');
  });

  it('source files are unchanged after build', async () => {
    const sourceFiles = ['src/App.tsx', 'src/CheckoutPage.tsx', 'src/Profile.tsx', 'src/Nav.tsx'];

    // Read source files before build
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

    // Read source files after build
    const after = sourceFiles.map(f => ({
      path: f,
      content: readFileSync(resolve(fixtureRoot, f), 'utf-8'),
    }));

    // Every source file should be identical
    for (let i = 0; i < before.length; i++) {
      expect(after[i].content).toBe(before[i].content);
    }
  });
});
