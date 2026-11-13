import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, normalizePath, type Plugin } from 'vite';
import baseConfig from './vite.e2e.config';

const root = fileURLToPath(new URL('.', import.meta.url));
const layoutPreview = (): Plugin => ({
  name: 'experimental-layout-preview',
  enforce: 'pre',
  apply: 'serve',
  resolveId(source, importer) {
    if (source === './App' && importer && normalizePath(importer).endsWith('/src/main.tsx')) {
      return resolve(root, 'src/dev/LayoutPreviewApp.tsx');
    }
    if (
      /^elkjs\/lib\/elk\.bundled(?:\.js)?$/.test(source) &&
      importer &&
      /\/libs\/designer(?:-v2)?\/src\/lib\/core\/graphlayout\/elklayout\.tsx$/.test(normalizePath(importer))
    ) {
      return resolve(root, 'src/dev/layoutPreviewEngine.ts');
    }
    if (importer && /\/src\/environments\//.test(normalizePath(importer)) && source.endsWith('/environment')) {
      return resolve(root, 'src/environments/environment.ephemeral.ts');
    }
    if (source.endsWith('/environments/environment')) {
      return resolve(root, 'src/environments/environment.ephemeral.ts');
    }
    return null;
  },
});

export default mergeConfig(baseConfig, {
  plugins: [layoutPreview()],
  resolve: {
    alias: [
      {
        find: '@microsoft/logic-apps-graph-layout',
        replacement: resolve(root, '../../libs/graph-layout/src/index.ts'),
      },
    ],
  },
  server: { host: '127.0.0.1', port: 4310, strictPort: true },
  optimizeDeps: { exclude: ['@microsoft/logic-apps-graph-layout'] },
});
