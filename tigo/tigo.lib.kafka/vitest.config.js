import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    timeout: 10000, // en milisegundos (10s),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'src/index.js',
        'vitest.config.js',
        'eslint.config.js'
      ]
    }
  }
})
