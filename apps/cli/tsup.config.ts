import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  dts: true,
  splitting: false,
  clean: true,
  // Bundle workspace packages (@smartlocator/*) but keep real npm deps external.
  noExternal: [/^@smartlocator\//],
  banner: { js: '#!/usr/bin/env node' },
});
