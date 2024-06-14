import { defineProject } from 'vitest/config';
import packageJson from './package.json';

export default defineProject({
  plugins: [],
  resolve: {
    alias: [
      {
        find: 'vscode',
        replacement: `${__dirname}/__mocks__/vscode`,
      },
      {
        find: '@microsoft/vscode-azext-utils',
        replacement: `${__dirname}/__mocks__/vscode`,
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
