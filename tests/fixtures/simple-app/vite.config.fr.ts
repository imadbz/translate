import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import translate from '../../../packages/vite-plugin/src/index.js';

// Dev config for manual French testing:
//   1. npx tsx serve.ts           (start translation server)
//   2. Write translations/fr.json  (or run English build first to get en.json)
//   3. npx vite dev --config vite.config.fr.ts
export default defineConfig({
  plugins: [
    translate({
      serverUrl: 'http://localhost:3100',
      locale: 'fr',
    }),
    react(),
  ],
});
