import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { upload, pollJob } from '@translate/vite-plugin/client';
import { startTestServer, stopTestServer, getServerUrl } from '../../helpers/test-server';

describe('client', () => {
  let serverUrl: string;

  beforeAll(async () => {
    const info = await startTestServer();
    serverUrl = info.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  describe('upload', () => {
    it('uploads files and returns a jobId', async () => {
      const result = await upload(serverUrl, {
        files: [
          { path: 'src/App.tsx', content: '<h1>Hello</h1>' },
        ],
      });
      expect(result.jobId).toBeDefined();
      expect(typeof result.jobId).toBe('string');
      expect(result.status).toBe('processing');
    });

    it('sends correct request body', async () => {
      const files = [
        { path: 'src/A.tsx', content: '<p>One</p>' },
        { path: 'src/B.tsx', content: '<p>Two</p>' },
      ];
      const result = await upload(serverUrl, { files });
      expect(result.jobId).toBeDefined();
    });

    it('fails with 400 for empty files array', async () => {
      await expect(
        upload(serverUrl, { files: [] })
      ).rejects.toThrow(/400/);
    });
  });

  describe('pollJob', () => {
    it('polls until job is complete', async () => {
      const { jobId } = await upload(serverUrl, {
        files: [{ path: 'src/App.tsx', content: '<h1>Hello</h1>' }],
      });

      const result = await pollJob(serverUrl, jobId, {
        interval: 50,
        timeout: 60000,
      });

      expect(result.status).toBe('complete');
      expect(result.files).toBeDefined();
      expect(result.translations).toBeDefined();
      expect(result.translations).toHaveProperty('en');
    });

    it('returns transformed files with t() calls', async () => {
      const { jobId } = await upload(serverUrl, {
        files: [
          { path: 'src/CheckoutPage.tsx', content: '<button>Pay now</button>' },
        ],
      });

      const result = await pollJob(serverUrl, jobId, {
        interval: 50,
        timeout: 60000,
      });

      expect(result.files).toHaveLength(1);
      expect(result.files![0].content).toContain('__t(');
      expect(Object.values(result.translations!.en)).toContain('Pay now');
    });

    it('throws on timeout', async () => {
      await expect(
        pollJob(serverUrl, 'nonexistent-job-id', {
          interval: 10,
          timeout: 50,
        })
      ).rejects.toThrow();
    });
  });
});
