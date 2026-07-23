import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    timeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'index.js',
        'vitest.config.js',
        'eslint.config.js',
        'src/utils/config.js',
        'src/utils/constants.js',
      ]
    }
  }
})
