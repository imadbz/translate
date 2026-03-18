import { describe, it, expect } from 'vitest';
import { build } from 'vite';
import { resolve } from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';
import react from '@vitejs/plugin-react';

describe('plugin removal', () => {
  const fixtureRoot = resolve(__dirname, '../fixtures/simple-app');

  it('app builds successfully without the translate plugin', async () => {
    const outDir = resolve(fixtureRoot, 'dist-no-plugin');

    // Build WITHOUT the translate plugin — just React
    await build({
      configFile: false,
      root: fixtureRoot,
      plugins: [react()],
      build: {
        outDir,
        write: true,
        minify: false,
      },
      logLevel: 'silent',
    });

    const assetsDir = resolve(outDir, 'assets');
    expect(existsSync(assetsDir)).toBe(true);

    const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);

    const bundleContent = jsFiles
      .map(f => readFileSync(resolve(assetsDir, f), 'utf-8'))
      .join('\n');

    // English strings should be present — app works in English by default
    expect(bundleContent).toContain('Checkout');
    expect(bundleContent).toContain('Pay now');
    expect(bundleContent).toContain('Home');
  });
});
