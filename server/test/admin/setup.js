import { beforeEach, vi } from 'vitest'

// jsdom provides localStorage automatically, but clear it between tests
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

// Mock fetch globally
global.fetch = vi.fn().mockRejectedValue(new Error('fetch not mocked for this test'))

// Mock URL methods for exportCSV tests
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()
