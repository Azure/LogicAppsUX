import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  treeshake: true,
  sourcemap: true,
  outDir: 'build/lib',
  minify: true,
  clean: true,
  splitting: true,
  tsconfig: 'tsconfig.json',
  format: ['esm'],
  external: [
    'react',
    'react-dom',
    '@formatjs/intl',
    '@xyflow/react',
    '@xyflow/system',
    'axios',
    'react-intl',
    '@tanstack/react-query',
    '@tanstack/react-query-persist-client',
    '@tanstack/query-sync-storage-persister',
  ],
  injectStyle: false,
  loader: {
    '.svg': 'dataurl',
  },
});
