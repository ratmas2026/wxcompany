import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/miniprogram/**/*.test.js'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['../miniprogram/utils/**/*.js'],
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
