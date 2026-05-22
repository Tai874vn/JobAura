import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'node',
      setupFiles: ['./src/shared/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        include: ['src/shared/**/*.ts'],
        exclude: [
          'src/shared/ui/**',
          'src/shared/icons/**',
          'src/shared/providers/**',
          'src/shared/schemas/index.ts',
          'src/shared/test/**',
        ],
      },
    },
  }
})
