import { defineConfig } from 'tsup';
import { lessLoader } from 'esbuild-plugin-less';

export default defineConfig({
  entry: ['src/index.ts'],
  treeshake: true,
  outDir: 'build/lib',
  sourcemap: 'inline',
  minify: false,
  clean: true,
  // dts: true,
  splitting: false,
  tsconfig: 'tsconfig.json',
  format: ['cjs', 'esm'],
  external: ['react', '~@xyflow/react/dist/style.css'],
  injectStyle: false,
  loader: {
    '.svg': 'dataurl',
  },
  esbuildPlugins: [lessLoader()],
});
