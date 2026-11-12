import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const single = !!process.env.SINGLE

export default defineConfig({
  base: './',
  plugins: [
    react(),
    ...(single
      ? [
          viteSingleFile(),
          {
            name: 'strip-manifest',
            transformIndexHtml: (html: string) =>
              html.replace(/<link rel="manifest"[^>]*>/g, '').replace(/<link rel="icon"[^>]*>/g, ''),
          },
        ]
      : []),
  ],
  define: { __SINGLE__: JSON.stringify(single) },
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
