import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  treeshake: true,
  sourcemap: true,
  outDir: 'build/lib',
  minify: true,
  clean: true,
  splitting: false,
  tsconfig: 'tsconfig.json',
  format: ['esm'],
  external: [
    'react',
    'react-dom',
    '@microsoft/logic-apps-shared',
    '@azure/arm-appcontainers',
    '@microsoft/vscode-azext-azureappservice',
    '@microsoft/vscode-azext-utils',
    '@xyflow/react',
    'axios',
    'react-intl',
    'tslib',
    'vscode',
    '@tanstack/react-query',
    '@tanstack/react-query-persist-client',
    '@tanstack/query-sync-storage-persister',
  ],
  injectStyle: false,
  loader: {
    '.svg': 'dataurl',
  },
});
