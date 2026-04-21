import { defineConfig } from 'tsup';
import { lessLoader } from 'esbuild-plugin-less';
export default defineConfig({
  entry: ['src/index.ts'],
  treeshake: true,
  outDir: 'build/lib',
  sourcemap: true,
  minify: true,
  clean: true,
  // dts: true,
  splitting: false,
  tsconfig: 'tsconfig.json',
  format: ['esm'],
  external: [
    'react',
    'react-dom',
    '@microsoft/logic-apps-shared',
    '@microsoft/designer-ui',
    '@fluentui/react',
    '@fluentui/react-components',
    '@fluentui/react-icons',
    'react-intl',
  ],
  injectStyle: false,
  loader: {
    '.svg': 'dataurl',
  },
  esbuildPlugins: [lessLoader()],
});
