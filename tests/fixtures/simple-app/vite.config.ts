import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import translate from '../../../packages/vite-plugin/src/index.js';

export default defineConfig({
  plugins: [
    translate({ serverUrl: 'http://localhost:3100' }),
    react(),
  ],
  resolve: {
    alias: {
      '@translate/react': new URL('../../../packages/react/src', import.meta.url).pathname,
    },
  },
});
