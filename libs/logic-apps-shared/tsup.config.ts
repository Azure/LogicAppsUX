import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  treeshake: true,
  sourcemap: 'inline',
  outDir: 'build/lib',
  minify: true,
  clean: true,
  splitting: true,
  tsconfig: 'tsconfig.json',
  format: ['cjs', 'esm'],
  external: ['react'],
  injectStyle: false,
  loader: {
    '.svg': 'dataurl',
  },
});
