import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/admin/**/*.test.js'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/admin/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['../admin/js/**/*.js'],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 20,
        statements: 30
      },
      reporter: ['text', 'lcov', 'html']
    }
  }
})
