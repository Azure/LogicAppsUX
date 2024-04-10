import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { nodePolyfills as np } from 'vite-plugin-node-polyfills';
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [{
      find: '~reactflow',
      replacement: 'reactflow',
    }],
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
    port: 4200
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  build: {
    rollupOptions: {
      plugins: [nodePolyfills()],
    },
  },
});
