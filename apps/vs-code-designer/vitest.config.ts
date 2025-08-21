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
    // Exclude E2E tests that use Mocha instead of Vitest
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      // Exclude E2E tests in src/test/ui/ that use Mocha
      'src/test/ui/**',
    ],
  },
});
