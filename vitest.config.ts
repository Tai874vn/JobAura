import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/shared/**/*.ts'],
      exclude: ['src/shared/ui/**', 'src/shared/icons/**', 'src/shared/providers/**', 'src/shared/schemas/index.ts'],
    },
  },
})
