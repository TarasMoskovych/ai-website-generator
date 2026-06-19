import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'src/tests/setup.ts',
        '**/*.d.ts',
        'vitest.config.ts',
        'next.config.ts',
        'postcss.config.mjs',
        'eslint.config.mjs',
      ],
    },
    // Property-based testing configuration for fast-check
    testTimeout: 30000, // 30 seconds for property tests
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
