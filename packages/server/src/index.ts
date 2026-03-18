import { serve } from '@hono/node-server';
import { createRoutes } from './routes.js';

export { createRoutes } from './routes.js';
export { processFiles } from './processor.js';
export { extractStrings } from './extract/extractor.js';
export { inlineTranslations } from './transform/inliner.js';
export { KeyRegistry, generateKey } from './transform/keygen.js';

export function startServer(port = 3100) {
  const app = createRoutes();

  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Translation server running on http://localhost:${info.port}`);
  });

  return server;
}
