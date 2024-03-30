import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    treeshake: true,
    outDir: 'build',
    sourcemap: 'inline',
    minify: true,
    clean: true,
    // dts: true,
    splitting: false,
    tsconfig: 'tsconfig.json',
    format: ['cjs', 'esm'],
    external: ['react'],
    injectStyle: false,
});