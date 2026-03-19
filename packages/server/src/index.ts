import { serve } from '@hono/node-server';
import { createRoutes, type ServerConfig } from './routes.js';
import { getModel } from './model.js';

export { createRoutes, type ServerConfig } from './routes.js';
export { processFiles, type ProcessOptions } from './processor.js';
export { extractStrings } from './extract/extractor.js';
export { inlineTranslations } from './transform/inliner.js';
export { emitTCalls } from './transform/emitter.js';
export { llmTransformFile, clearTransformCache } from './transform/llm-transform.js';
export { KeyRegistry, generateKey } from './transform/keygen.js';
export { translateStrings } from './translate/llm.js';
export { hashStrings, getCached, setCache, clearCache } from './translate/cache.js';
export { getModel } from './model.js';

export function startServer(config?: Partial<ServerConfig>, port = 3100) {
  const app = createRoutes({ model: config?.model ?? getModel() });

  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Translation server running on http://localhost:${info.port}`);
  });

  return server;
}
