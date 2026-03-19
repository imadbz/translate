import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { collectFiles } from '@translate/vite-plugin/collector';
import { startTestServer, stopTestServer } from '../helpers/test-server';
import { upload, pollJob } from '@translate/vite-plugin/client';

describe('source files unchanged', () => {
  let serverUrl: string;
  const fixtureRoot = resolve(__dirname, '../fixtures/simple-app');

  beforeAll(async () => {
    const info = await startTestServer();
    serverUrl = info.url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('source file contents are identical before and after server processing', async () => {
    const files = await collectFiles(fixtureRoot, ['src/**/*.tsx'], []);

    const hashesBefore = files.map(f => ({
      path: f.path,
      hash: createHash('sha256').update(f.content).digest('hex'),
    }));

    const { jobId } = await upload(serverUrl, { files });
    await pollJob(serverUrl, jobId, { interval: 50, timeout: 60000 });

    const hashesAfter = files.map(f => ({
      path: f.path,
      hash: createHash('sha256')
        .update(readFileSync(resolve(fixtureRoot, f.path), 'utf-8'))
        .digest('hex'),
    }));

    for (let i = 0; i < hashesBefore.length; i++) {
      expect(hashesAfter[i].hash).toBe(hashesBefore[i].hash);
    }
  });
});
