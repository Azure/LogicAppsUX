import { defineProject } from 'vitest/config';
import packageJson from './package.json';

export default defineProject({
  plugins: [],
  resolve: {
    alias: [
      {
        find: 'vscode',
        replacement: `${__dirname}/node_modules/@types/vscode/index.d`,
      },
      {
        find: '@microsoft/vscode-azext-utils',
        replacement: `${__dirname}/node_modules/@types/vscode/index.d`,
      },
    ],
  },
  test: {
    name: packageJson.name,
    dir: './src',
    watch: false,
    environment: 'jsdom',
    setupFiles: ['test-setup.ts'],
    coverage: { enabled: true, provider: 'istanbul', include: ['src/**/*'], reporter: ['html', 'cobertura'] },
    restoreMocks: true,
  },
});
