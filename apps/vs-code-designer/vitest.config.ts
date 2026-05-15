import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import packageJson from './package.json';

const packagePath = 'apps/vs-code-designer/';
const coverageIncludeFile = path.resolve(__dirname, '.coverage-include');

const toCoverageInclude = (files: string[]): string[] =>
  files
    .filter(
      (file) =>
        file.startsWith('src/') &&
        (file.endsWith('.ts') || file.endsWith('.tsx')) &&
        !file.includes('/__test__/') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.test.tsx')
    )
    .map((file) => file.replace(/\\/g, '/'));

const getConfiguredCoverageInclude = (): string[] | undefined => {
  if (!existsSync(coverageIncludeFile)) {
    return undefined;
  }

  return toCoverageInclude(readFileSync(coverageIncludeFile, 'utf8').split(/\r?\n/));
};

const getBaseRefCandidates = (baseRef: string): string[] => {
  const candidates: string[] = [];
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (eventPath) {
    try {
      const event = JSON.parse(readFileSync(eventPath, 'utf8'));
      const baseSha = event.pull_request?.base?.sha;

      if (baseSha) {
        candidates.push(baseSha);
      }
    } catch {
      // Fall back to named refs below when the GitHub event payload is unavailable.
    }
  }

  candidates.push(`origin/${baseRef}`, `upstream/${baseRef}`, baseRef);
  return candidates;
};

const getCoverageInclude = (): string[] => {
  const configuredCoverageInclude = getConfiguredCoverageInclude();

  if (configuredCoverageInclude) {
    return configuredCoverageInclude.length ? configuredCoverageInclude : ['src/__coverage_placeholder__.ts'];
  }

  const baseRef = process.env.GITHUB_BASE_REF;

  if (!baseRef) {
    return ['src/**/*'];
  }

  const repositoryRoot = path.resolve(__dirname, '../..');

  for (const candidateBaseRef of getBaseRefCandidates(baseRef)) {
    try {
      const changedFiles = execFileSync('git', ['diff', '--name-only', `${candidateBaseRef}...HEAD`, '--', `${packagePath}src`], {
        cwd: repositoryRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .split(/\r?\n/)
        .filter((file) => file.startsWith(packagePath))
        .map((file) => file.slice(packagePath.length));

      const coverageInclude = toCoverageInclude(changedFiles);

      return coverageInclude.length ? coverageInclude : ['src/__coverage_placeholder__.ts'];
    } catch {
      // Try the next remote/ref form. CI uses origin; local hotfix worktrees may use upstream.
    }
  }

  return ['src/__coverage_placeholder__.ts'];
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
