import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import packageJson from './package.json';

const packagePath = 'apps/vs-code-designer/';

const getCoverageInclude = (): string[] => {
  const baseRef = process.env.GITHUB_BASE_REF;

  if (!baseRef) {
    return ['src/**/*'];
  }

  const repositoryRoot = path.resolve(__dirname, '../..');
  const baseRefCandidates = [`origin/${baseRef}`, `upstream/${baseRef}`, baseRef];

  for (const candidateBaseRef of baseRefCandidates) {
    try {
      const changedFiles = execFileSync('git', ['diff', '--name-only', `${candidateBaseRef}...HEAD`, '--', `${packagePath}src`], {
        cwd: repositoryRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .split(/\r?\n/)
        .filter(
          (file) =>
            file.startsWith(packagePath) &&
            (file.endsWith('.ts') || file.endsWith('.tsx')) &&
            !file.includes('/__test__/') &&
            !file.endsWith('.test.ts') &&
            !file.endsWith('.test.tsx')
        )
        .map((file) => file.slice(packagePath.length));

      return changedFiles.length ? changedFiles : ['src/__coverage_placeholder__.ts'];
    } catch {
      // Try the next remote/ref form. CI uses origin; local hotfix worktrees may use upstream.
    }
  }

  return ['src/**/*'];
};

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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['test-setup.ts'],
    fileParallelism: false,
    coverage: {
      enabled: true,
      provider: 'istanbul',
      include: getCoverageInclude(),
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__test__/**', 'src/test/e2e/**', 'src/test/ui/**'],
      reporter: ['html', 'cobertura', 'lcov'],
    },
    restoreMocks: true,
    // Exclude E2E tests that use Mocha instead of Vitest
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'out/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      // Exclude VS Code E2E suites that run under the extension test harness, not Vitest.
      'src/test/e2e/**',
      // Exclude Mocha-driven UI tests from both source and generated output.
      'src/test/ui/**',
    ],
  },
});
