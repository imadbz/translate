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

  it('sends files to server and receives transformed files back', async () => {
    // 1. Collect files (like the plugin would)
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    expect(files.length).toBeGreaterThan(0);

    // 2. Upload to server
    const { jobId } = await upload(serverUrl, {
      locale: 'en',
      files,
    });
    expect(jobId).toBeDefined();

    // 3. Poll for results
    const result = await pollJob(serverUrl, jobId, {
      interval: 50,
      timeout: 10000,
    });

    // 4. Verify response structure
    expect(result.status).toBe('complete');
    expect(result.files).toBeDefined();
    expect(result.files!.length).toBe(files.length);
    expect(result.translations).toBeDefined();

    // 5. Verify translations were extracted
    const translationValues = Object.values(result.translations!);
    expect(translationValues).toContain('Checkout');
    expect(translationValues).toContain('Pay now');
    expect(translationValues).toContain('Home');
  });

  it('performs identity transform for English locale', async () => {
    const files = await collectFiles(fixtureRoot, ['src/CheckoutPage.tsx'], []);
    const { jobId } = await upload(serverUrl, { locale: 'en', files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    // English = identity — files should be unchanged
    expect(result.files![0].content).toBe(files[0].content);
  });

  it('replaces strings for French locale', async () => {
    const files = await collectFiles(fixtureRoot, ['src/CheckoutPage.tsx'], []);

    const { jobId } = await upload(serverUrl, {
      locale: 'fr',
      files,
      translations: {
        'checkout_page.checkout': 'Paiement',
        'checkout_page.review_your_order_before_paying': 'Vérifiez votre commande',
        'checkout_page.pay_now': 'Payer maintenant',
      },
    });

    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    expect(result.files![0].content).toContain('Paiement');
    expect(result.files![0].content).toContain('Payer maintenant');
    // Non-translatable content preserved
    expect(result.files![0].content).toContain('btn-primary');
  });

  it('preserves template literal expressions', async () => {
    const files = await collectFiles(fixtureRoot, ['src/Profile.tsx'], []);

    const { jobId } = await upload(serverUrl, {
      locale: 'fr',
      files,
      translations: {
        'profile.hello_name': 'Bonjour {name}',
      },
    });

    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });
    const content = result.files![0].content;

    // Should have translated template literal but kept the expression
    expect(content).toContain('Bonjour ');
    // The ${name} variable reference should still exist
    expect(content).toContain('name');
  });

  it('extracts strings from all fixture files', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    const { jobId } = await upload(serverUrl, { locale: 'en', files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    const values = Object.values(result.translations!);

    // CheckoutPage strings
    expect(values).toContain('Checkout');
    expect(values).toContain('Pay now');
    expect(values).toContain('Review your order before paying');

    // Nav strings
    expect(values).toContain('Home');
    expect(values).toContain('Account');
    expect(values).toContain('Sign in');

    // Profile strings
    expect(values).toContain('Search orders');
    expect(values).toContain('Get help');
    expect(values).toContain('Help');
    expect(values).toContain('Your cart is empty');
  });

  it('does NOT extract CSS classes, URLs, or code strings', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);
    const { jobId } = await upload(serverUrl, { locale: 'en', files });
    const result = await pollJob(serverUrl, jobId, { interval: 50, timeout: 10000 });

    const values = Object.values(result.translations!);
    const keys = Object.keys(result.translations!);

    // Should NOT contain CSS classes
    expect(values).not.toContain('btn-primary');
    expect(values).not.toContain('flex items-center');

    // Should NOT contain URLs
    expect(values).not.toContain('https://example.com/help');
    expect(values).not.toContain('/');

    // Should NOT contain type attributes
    expect(values).not.toContain('submit');
  });
});
