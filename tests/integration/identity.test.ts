import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../helpers/test-server';
import { upload, pollJob } from '@translate/vite-plugin/client';
import { collectFiles } from '@translate/vite-plugin/collector';
import { resolve } from 'path';

describe('identity transform', () => {
  let serverUrl: string;
  const fixtureRoot = resolve(__dirname, '../fixtures/simple-app');

  beforeAll(async () => {
    const info = await startTestServer();
    serverUrl = info.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('English locale returns files with identical content', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);

    const { jobId } = await upload(serverUrl, { locale: 'en', files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    expect(result.files).toHaveLength(files.length);

    for (let i = 0; i < files.length; i++) {
      const original = files.find(f => f.path === result.files![i].path);
      expect(original).toBeDefined();
      expect(result.files![i].content).toBe(original!.content);
    }
  });

  it('English locale still extracts translations', async () => {
    const files = await collectFiles(fixtureRoot, ['src/CheckoutPage.tsx'], []);

    const { jobId } = await upload(serverUrl, { locale: 'en', files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    expect(Object.keys(result.translations!).length).toBeGreaterThan(0);
    expect(Object.values(result.translations!)).toContain('Checkout');
    expect(Object.values(result.translations!)).toContain('Pay now');
  });
});
