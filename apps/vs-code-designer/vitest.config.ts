import { defineConfig } from 'vitest/config';
import packageJson from './package.json';
import path from 'path';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      vscode: path.resolve(path.join(__dirname, 'node_modules', '@types', 'vscode', 'index.d.ts')),
      '@microsoft/vscode-azext-azureauth/out/src/getSessionFromVSCode': '/__mocks__/vscode-azext-azureauth.ts',
    },
  },
  test: {
    name: packageJson.name,
    environment: 'node',
    setupFiles: ['test-setup.ts'],
    coverage: { enabled: true, provider: 'istanbul', include: ['src/**/*'], reporter: ['html', 'cobertura'] },
    restoreMocks: true,
  },
});
