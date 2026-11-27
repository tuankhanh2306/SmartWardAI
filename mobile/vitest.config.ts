import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: true,
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/__tests__/vitestSetup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
  },
});
