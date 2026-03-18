import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../helpers/test-server';
import { upload, pollJob } from '@translate/vite-plugin/client';
import { collectFiles } from '@translate/vite-plugin/collector';
import { resolve } from 'path';

describe('round-trip: plugin → server → plugin', () => {
  let serverUrl: string;
  const fixtureRoot = resolve(__dirname, '../fixtures/simple-app');

  beforeAll(async () => {
    const info = await startTestServer();
    serverUrl = info.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('sends files to server and receives transformed files with t() calls', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    expect(files.length).toBeGreaterThan(0);

    const { jobId } = await upload(serverUrl, { files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    expect(result.status).toBe('complete');
    expect(result.files).toBeDefined();
    expect(result.files!.length).toBe(files.length);
    expect(result.translations).toBeDefined();

    // Translations extracted
    const translationValues = Object.values(result.translations!);
    expect(translationValues).toContain('Checkout');
    expect(translationValues).toContain('Pay now');
    expect(translationValues).toContain('Home');
  });

  it('transformed files contain t() calls', async () => {
    const files = await collectFiles(fixtureRoot, ['src/CheckoutPage.tsx'], []);
    const { jobId } = await upload(serverUrl, { files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    const content = result.files![0].content;
    expect(content).toContain('__t(');
    expect(content).toContain('@translate/react');
    expect(content).toContain('__useT()');
  });

  it('transformed files preserve non-translatable content', async () => {
    const files = await collectFiles(fixtureRoot, ['src/CheckoutPage.tsx'], []);
    const { jobId } = await upload(serverUrl, { files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    const content = result.files![0].content;
    expect(content).toContain('btn-primary');
    expect(content).toContain('submit');
  });

  it('extracts strings from all fixture files', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    const { jobId } = await upload(serverUrl, { files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    const values = Object.values(result.translations!);
    expect(values).toContain('Checkout');
    expect(values).toContain('Pay now');
    expect(values).toContain('Review your order before paying');
    expect(values).toContain('Home');
    expect(values).toContain('Account');
    expect(values).toContain('Sign in');
    expect(values).toContain('Search orders');
    expect(values).toContain('Get help');
    expect(values).toContain('Help');
    expect(values).toContain('Your cart is empty');
  });

  it('does NOT extract CSS classes, URLs, or code strings', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    const { jobId } = await upload(serverUrl, { files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    const values = Object.values(result.translations!);
    expect(values).not.toContain('btn-primary');
    expect(values).not.toContain('https://example.com/help');
    expect(values).not.toContain('/');
    expect(values).not.toContain('submit');
  });
});
