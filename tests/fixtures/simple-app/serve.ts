import { serve } from '@hono/node-server';
import { createRoutes } from '../../../packages/server/src/routes.js';

const app = createRoutes();
serve({ fetch: app.fetch, port: 3100 }, () => {
  console.log('Translation server running on http://localhost:3100');
});
