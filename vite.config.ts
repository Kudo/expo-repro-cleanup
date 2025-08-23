/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    silent: 'passed-only',
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
    },
  },
});
