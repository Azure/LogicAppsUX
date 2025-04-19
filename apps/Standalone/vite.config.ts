import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { nodePolyfills as np } from 'vite-plugin-node-polyfills';
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [
      {
        find: '~@xyflow/react',
        replacement: '@xyflow/react',
      },
    ],
  },
  plugins: [
    react(),
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }),
    np(),
    mkcert(),
  ],
  server: {
    port: 4200,
    proxy: {
      '/templatesLocalProxy': {
        target: 'https://logicappsux-cdcee2hegtgdhegv.b02.azurefd.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/templatesLocalProxy/, ''),
        secure: false, // Optional: skip SSL validation in dev
      },
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    // sourcemap: true,
    minify: false,
    rollupOptions: {
      plugins: [nodePolyfills()],
      //external: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-query-devtools'],
    },
  },
});
