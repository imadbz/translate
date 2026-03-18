import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from 'vite';
import { resolve } from 'path';
import { readFileSync, existsSync, readdirSync, rmSync } from 'fs';
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

    // Seed French for integration tests
    await fetch(`${info.url}/projects/test-app/locales/fr`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'checkout_page.checkout': 'Paiement',
        'checkout_page.pay_now': 'Payer maintenant',
      }),
    });
  });

  afterAll(async () => {
    await stopTestServer();
    rmSync(translationsDir, { recursive: true, force: true });
  });

  it('builds and writes locale files from server response', async () => {
    const outDir = resolve(fixtureRoot, 'dist-en');

    await build({
      configFile: false,
      root: fixtureRoot,
      plugins: [
        translatePlugin({ serverUrl, projectId: 'test-app' }),
        react(),
      ],
      build: { outDir, write: true, minify: false },
      logLevel: 'silent',
    });

    // en.json should exist
    const enJsonPath = resolve(translationsDir, 'en.json');
    expect(existsSync(enJsonPath)).toBe(true);
    const enJson = JSON.parse(readFileSync(enJsonPath, 'utf-8'));
    expect(enJson).toHaveProperty('checkout_page.pay_now', 'Pay now');

    // fr.json should also exist (from server project config)
    const frJsonPath = resolve(translationsDir, 'fr.json');
    expect(existsSync(frJsonPath)).toBe(true);
    const frJson = JSON.parse(readFileSync(frJsonPath, 'utf-8'));
    expect(frJson).toHaveProperty('checkout_page.pay_now', 'Payer maintenant');
  });

  it('build output contains t() calls (not raw strings)', async () => {
    const outDir = resolve(fixtureRoot, 'dist-tcalls');

    await build({
      configFile: false,
      root: fixtureRoot,
      plugins: [
        translatePlugin({ serverUrl }),
        react(),
      ],
      build: { outDir, write: true, minify: false },
      logLevel: 'silent',
    });

    const assetsDir = resolve(outDir, 'assets');
    expect(existsSync(assetsDir)).toBe(true);

    const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    const bundleContent = jsFiles
      .map(f => readFileSync(resolve(assetsDir, f), 'utf-8'))
      .join('\n');

    expect(bundleContent).toContain('checkout_page.pay_now');
    expect(bundleContent).toContain('checkout_page.checkout');
  });

  it('source files are unchanged after build', async () => {
    const sourceFiles = ['src/App.tsx', 'src/CheckoutPage.tsx', 'src/Profile.tsx', 'src/Nav.tsx'];

    const before = sourceFiles.map(f => ({
      path: f,
      content: readFileSync(resolve(fixtureRoot, f), 'utf-8'),
    }));

    await build({
      configFile: false,
      root: fixtureRoot,
      plugins: [
        translatePlugin({ serverUrl }),
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
