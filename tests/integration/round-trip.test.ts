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
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 60000 });

    expect(result.status).toBe('complete');
    expect(result.files).toBeDefined();
    expect(result.files!.length).toBe(files.length);
    expect(result.translations).toHaveProperty('en');

    const enValues = Object.values(result.translations!.en);
    expect(enValues).toContain('Checkout');
    expect(enValues).toContain('Pay now');
    expect(enValues).toContain('Home');
  });

  it('transformed files contain t() calls', async () => {
    const files = await collectFiles(fixtureRoot, ['src/CheckoutPage.tsx'], []);
    const { jobId } = await upload(serverUrl, { files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 60000 });

    const content = result.files![0].content;
    expect(content).toContain('__t(');
    expect(content).toContain('@translate/react');
    expect(content).toContain('__useT()');
  });

  it('returns additional locales when project has them configured', async () => {
    // Configure French locale for a test project
    await fetch(`${serverUrl}/projects/test-project/locales`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locales: ['en', 'fr'] }),
    });

    const files = await collectFiles(fixtureRoot, ['src/CheckoutPage.tsx'], []);
    const { jobId } = await upload(serverUrl, { files, projectId: 'test-project' });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 60000 });

    expect(result.translations).toHaveProperty('en');
    expect(result.translations).toHaveProperty('fr');
    // Mock model returns source strings — just verify the key exists
    expect(result.translations!.fr).toHaveProperty('checkout_page.pay_now');
  });

  it('extracts strings from all fixture files', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    const { jobId } = await upload(serverUrl, { files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 60000 });

    const values = Object.values(result.translations!.en);
    expect(values).toContain('Checkout');
    expect(values).toContain('Pay now');
    expect(values).toContain('Home');
    expect(values).toContain('Account');
    expect(values).toContain('Sign in');
    expect(values).toContain('Search orders');
    expect(values).toContain('Your cart is empty');
  });

  it('does NOT extract CSS classes, URLs, or code strings', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    const { jobId } = await upload(serverUrl, { files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 60000 });

    const values = Object.values(result.translations!.en);
    expect(values).not.toContain('btn-primary');
    expect(values).not.toContain('https://example.com/help');
    expect(values).not.toContain('/');
    expect(values).not.toContain('submit');
  });
});
