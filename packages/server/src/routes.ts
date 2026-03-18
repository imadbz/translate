import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { processFiles, type Job, type FileInput } from './processor.js';

// In-memory project locale store (in production this would be a database)
const projectLocales = new Map<string, Record<string, Record<string, string>>>();

export function createRoutes() {
  const app = new Hono();
  const jobs = new Map<string, Job>();

  // Set translations for a project's locale
  app.put('/projects/:projectId/locales/:locale', async (c) => {
    const projectId = c.req.param('projectId');
    const locale = c.req.param('locale');
    const translations = await c.req.json<Record<string, string>>();

    if (!projectLocales.has(projectId)) {
      projectLocales.set(projectId, {});
    }
    projectLocales.get(projectId)![locale] = translations;
    return c.json({ ok: true });
  });

  // Get all locales for a project
  app.get('/projects/:projectId/locales', (c) => {
    const projectId = c.req.param('projectId');
    const locales = projectLocales.get(projectId) ?? {};
    return c.json(locales);
  });

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
      files: body.files,
    };
    jobs.set(jobId, job);

    // Look up locale translations for this project
    const localeTranslations = body.projectId
      ? projectLocales.get(body.projectId)
      : undefined;

    // Process asynchronously
    setImmediate(() => {
      try {
        const result = processFiles(body.files, localeTranslations);
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
