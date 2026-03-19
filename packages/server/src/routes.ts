import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { processFiles, type Job, type FileInput, type ProcessOptions } from './processor.js';

// In-memory project config (in production this would be a database)
const projectLocales = new Map<string, string[]>();

export interface ServerConfig {
  /** AI model to use for translations */
  model: ProcessOptions['model'];
}

export function createRoutes(config: ServerConfig) {
  const app = new Hono();
  const jobs = new Map<string, Job>();

  // Configure locales for a project
  app.put('/projects/:projectId/locales', async (c) => {
    const projectId = c.req.param('projectId');
    const body = await c.req.json<{ locales: string[] }>();
    projectLocales.set(projectId, body.locales);
    return c.json({ ok: true, locales: body.locales });
  });

  // Get locales for a project
  app.get('/projects/:projectId/locales', (c) => {
    const projectId = c.req.param('projectId');
    const locales = projectLocales.get(projectId) ?? ['en'];
    return c.json({ locales });
  });

  app.post('/upload', async (c) => {
    const body = await c.req.json<{
      projectId?: string;
      files: FileInput[];
    }>();

    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return c.json({ error: 'files array is required and must not be empty' }, 400);
    }

    console.log(`[upload] projectId=${body.projectId ?? '(none)'} files=${body.files.map(f => f.path).join(', ')}`);

    const jobId = randomUUID();
    const job: Job = {
      id: jobId,
      status: 'processing',
      files: body.files,
    };
    jobs.set(jobId, job);

    // Look up locales for this project
    const locales = body.projectId
      ? (projectLocales.get(body.projectId) ?? ['en'])
      : ['en'];

    // Process asynchronously
    (async () => {
      try {
        const result = await processFiles(body.files, {
          model: config.model,
          locales,
        });
        job.result = result;
        job.status = 'complete';
      } catch (err) {
        job.status = 'error';
        job.error = err instanceof Error ? err.message : String(err);
      }
    })();

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
