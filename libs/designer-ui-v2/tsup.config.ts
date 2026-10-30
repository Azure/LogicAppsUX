import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/metrics.ts'],
  outDir: 'build/lib',
  format: ['esm'],
  clean: true,
  treeshake: true,
  splitting: true,
  sourcemap: true,
  minify: true,
  external: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', '@fluentui/react-components', '@fluentui/react-icons'],
});
