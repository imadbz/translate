import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import translatePlugin from '@translate/vite-plugin';
import { startTestServer, stopTestServer } from '../../helpers/test-server';
import type { Plugin } from 'vite';

describe('translatePlugin', () => {
  let serverUrl: string;

  beforeAll(async () => {
    const info = await startTestServer();
    serverUrl = info.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('returns a Vite plugin object', () => {
    const plugin = translatePlugin({ serverUrl });
    expect(plugin.name).toBe('vite-plugin-translate');
    expect(plugin.enforce).toBe('pre');
  });

  it('has buildStart and transform hooks', () => {
    const plugin = translatePlugin({ serverUrl }) as Plugin;
    expect(plugin.buildStart).toBeDefined();
    expect(plugin.transform).toBeDefined();
    expect(plugin.configResolved).toBeDefined();
  });

  it('accepts all options', () => {
    const plugin = translatePlugin({
      serverUrl,
      locale: 'fr',
      include: ['src/**/*.tsx'],
      exclude: ['**/*.test.*'],
      pollInterval: 100,
      pollTimeout: 5000,
    });
    expect(plugin.name).toBe('vite-plugin-translate');
  });
});
