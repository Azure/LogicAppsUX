import { defineProject } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineProject({
  plugins: [react()],
  test: {
    name: packageJson.name,
    dir: './src',
    watch: false,
    environment: 'jsdom',
    setupFiles: ['test-setup.ts'],
    globalSetup: './test-globals.ts',
    coverage: { enabled: true, provider: 'istanbul', include: ['src/**/*'], reporter: ['html', 'cobertura'] },
    restoreMocks: true,
    alias: [
      {
        find: /^monaco-editor$/,
        replacement: `${__dirname}/node_modules/monaco-editor/esm/vs/editor/editor.api`,
      },
    ],
  },
});
