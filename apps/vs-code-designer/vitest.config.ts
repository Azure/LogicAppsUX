import { defineProject } from 'vitest/config';
import packageJson from './package.json';
import path from 'path';

export default defineProject({
  plugins: [],
  resolve: {
    alias: {
      vscode: path.resolve(path.join(__dirname, 'node_modules', '@types', 'vscode', 'index.d.ts')),
    },
  },
  test: {
    name: packageJson.name,
    dir: './src',
    watch: false,
    environment: 'node',
    setupFiles: ['test-setup.ts'],
    coverage: { enabled: true, provider: 'istanbul', include: ['src/**/*'], reporter: ['html', 'cobertura'] },
    restoreMocks: true,
  },
});
