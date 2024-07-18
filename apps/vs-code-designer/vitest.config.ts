import { defineProject } from 'vitest/config';
import packageJson from './package.json';

export default defineProject({
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
      {
        find: 'child_process',
        replacement: `${__dirname}/node_modules/.pnpm/@types+node@20.12.7/node_modules/@types/node/child_process.d`,
      },
    ],
  },
  plugins: [],
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
