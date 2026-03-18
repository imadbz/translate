import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@translate/vite-plugin': new URL('./packages/vite-plugin/src', import.meta.url).pathname,
      '@translate/server': new URL('./packages/server/src', import.meta.url).pathname,
      '@translate/react': new URL('./packages/react/src', import.meta.url).pathname,
    },
  },
});
