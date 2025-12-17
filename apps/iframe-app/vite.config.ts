import { existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';

// Custom plugin to rename index.html to iframe.html after build
function renameIndexHtml(): Plugin {
  return {
    name: 'rename-index-html',
    closeBundle() {
      // closeBundle runs after all files are written to disk
      const outDir = resolve(__dirname, 'dist');
      const indexPath = resolve(outDir, 'index.html');
      const iframePath = resolve(outDir, 'iframe.html');

      if (existsSync(indexPath)) {
        renameSync(indexPath, iframePath);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    renameIndexHtml(),
    // Only use mkcert (HTTPS) locally, not in CI or E2E
    ...(process.env.CI || process.env.E2E ? [] : [mkcert()]),
  ],
  base: './', // Use relative paths instead of absolute
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: '[name]-[hash].[ext]',
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
      },
    },
  },
  server: {
    port: 3001,
    host: true,
  },
});
