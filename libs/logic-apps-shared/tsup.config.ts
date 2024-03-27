import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    treeshake: true,
    sourcemap: 'inline',
    outDir: 'build/lib',
    minify: true,
    clean: true,
    dts: true,
    splitting: false,
    tsconfig: 'tsconfig.lib.json',
    format: ['cjs', 'esm'],
    external: ['react'],
    injectStyle: false,
});