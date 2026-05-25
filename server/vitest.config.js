import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/server/**/*.test.js'],
    environment: 'node',
    globals: true,
    setupFiles: ['./test/server/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['server.js', 'db.js'],
      exclude: ['test/**'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50
      },
      reporter: ['text', 'lcov', 'html']
    }
  }
})
