import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/collect.ts', 'src/sync.ts'],
  outDir: 'dist',
  format: ['cjs'],
  clean: true,
  minify: false,
  sourcemap: true,
})