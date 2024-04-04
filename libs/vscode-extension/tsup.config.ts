import { defineConfig } from 'tsup';
import svgr from 'esbuild-plugin-svgr'

export default defineConfig({
    entry: ['src/index.ts'],
    treeshake: true,
    sourcemap: 'inline',
    outDir: 'build/lib',
    minify: false,
    clean: true,
    splitting: false,
    tsconfig: 'tsconfig.json',
    format: ['cjs', 'esm'],
    external: ['react'],
    injectStyle: false,
    loader: {
        '.svg': 'dataurl',
    },
});