import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    treeshake: true,
    outDir: 'build/lib',
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