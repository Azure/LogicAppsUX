import { defineConfig } from 'tsup';
import { lessLoader } from 'esbuild-plugin-less';
export default defineConfig({
  entry: ['src/index.ts'],
  treeshake: true,
  outDir: 'build/lib',
  sourcemap: 'inline',
  minify: true,
  clean: true,
  // dts: true,
  splitting: true,
  tsconfig: 'tsconfig.json',
  format: ['cjs', 'esm'],
  external: ['react'],
  injectStyle: false,
  loader: {
    '.svg': 'dataurl',
  },
  esbuildPlugins: [lessLoader()],
});
