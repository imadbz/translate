import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { processFiles, type Job, type FileInput } from './processor.js';

export function createRoutes() {
  const app = new Hono();
  const jobs = new Map<string, Job>();

  app.post('/upload', async (c) => {
    const body = await c.req.json<{
      projectId?: string;
      files: FileInput[];
    }>();

    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return c.json({ error: 'files array is required and must not be empty' }, 400);
    }

    const jobId = randomUUID();
    const job: Job = {
      id: jobId,
      status: 'processing',
      locale: 'en',
      files: body.files,
    };
    jobs.set(jobId, job);

    // Process asynchronously
    setImmediate(() => {
      try {
        const result = processFiles(body.files);
        job.result = result;
        job.status = 'complete';
      } catch (err) {
        job.status = 'error';
        job.error = err instanceof Error ? err.message : String(err);
      }
    });

    return c.json({ jobId, status: 'processing' }, 202);
  });

  app.get('/jobs/:id', (c) => {
    const jobId = c.req.param('id');
    const job = jobs.get(jobId);

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    if (job.status === 'processing') {
      return c.json({ jobId: job.id, status: 'processing' });
    }

    if (job.status === 'error') {
      return c.json({ jobId: job.id, status: 'error', error: job.error }, 500);
    }

    return c.json({
      jobId: job.id,
      status: 'complete',
      files: job.result!.files,
      translations: job.result!.translations,
    });
  });

  app.get('/health', (c) => c.json({ status: 'ok' }));

  return app;
}
