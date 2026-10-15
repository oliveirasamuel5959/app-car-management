import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  /*
    Mirrors the `@` / `@shared` / `@assets` aliases from vite.config.ts. Vitest
    does not read that file, so without these a test importing a module that
    uses an alias fails to resolve — which is why every test here used to be
    written with relative paths only.
  */
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
