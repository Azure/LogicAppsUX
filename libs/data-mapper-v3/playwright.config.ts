import { defineConfig, devices } from '@playwright/test';

// Drives the real webview bundle (out/webview/webview.js) in Chromium against a mock VS Code host.
// The global setup rebuilds the bundle when it is missing or older than src/.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/globalSetup.ts',
  globalTeardown: './e2e/coverage.ts',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: './playwright-report' }], ['json', { outputFile: './test-results/results.json' }]]
    : [['list'], ['json', { outputFile: './test-results/results.json' }]],
  use: {
    trace: 'on-first-retry',
    video: 'off',
    viewport: { width: 1600, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } } }],
});
