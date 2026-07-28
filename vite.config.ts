import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Global setup: runs once before all suites to apply migrations to in-memory SQLite
    globalSetup: ['./server/test/setup.ts'],
    // Per-test-file setup: frontend (jest-dom matchers) + server (DB reset between tests)
    setupFiles: ['./src/test/setup.ts', './server/test/resetDb.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server/**/*.ts'],
      exclude: [
        'server/test/**',
        'server/app.ts',
        'server/**/*.test.ts',
        'server/**/*.property.test.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // fast-check uses 100 iterations (numRuns) by default — no override needed
  },
})
