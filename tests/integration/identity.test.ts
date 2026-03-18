import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../helpers/test-server';
import { upload, pollJob } from '@translate/vite-plugin/client';
import { collectFiles } from '@translate/vite-plugin/collector';
import { resolve } from 'path';

describe('extraction consistency', () => {
  let serverUrl: string;
  const fixtureRoot = resolve(__dirname, '../fixtures/simple-app');

  beforeAll(async () => {
    const info = await startTestServer();
    serverUrl = info.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('same files produce same translations on repeated uploads', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);

    const { jobId: id1 } = await upload(serverUrl, { files });
    const result1 = await pollJob(serverUrl, id1, { interval: 50, timeout: 10000 });

    const { jobId: id2 } = await upload(serverUrl, { files });
    const result2 = await pollJob(serverUrl, id2, { interval: 50, timeout: 10000 });

    // Same keys and values both times (deterministic)
    expect(result1.translations).toEqual(result2.translations);
  });

  it('extracts all translatable strings', async () => {
    const files = await collectFiles(fixtureRoot, ['src/CheckoutPage.tsx'], []);

    const { jobId } = await upload(serverUrl, { files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    expect(Object.keys(result.translations!).length).toBeGreaterThan(0);
    expect(Object.values(result.translations!)).toContain('Checkout');
    expect(Object.values(result.translations!)).toContain('Pay now');
  });
});
