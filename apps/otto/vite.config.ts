import { defineConfig } from 'vite';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { nodePolyfills as np } from 'vite-plugin-node-polyfills';
import mkcert from 'vite-plugin-mkcert';
import { reactRouter } from '@react-router/dev/vite';

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
    reactRouter(),
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }),
    np({
      // Only polyfill for client, not SSR
      include: ['buffer', 'process'],
      protocolImports: false,
    }),
    mkcert(),
  ],
  server: {
    port: 4201,
    proxy: {
      '/templatesLocalProxy': {
        target: 'https://priti-cxf4h5cpcteue4az.b02.azurefd.net',
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
  optimizeDeps: {
    exclude: ['node_modules/.cache'],
  },
});
