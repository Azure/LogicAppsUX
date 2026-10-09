import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/ephemeral',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-ephemeral', open: 'never' }]],
  outputDir: 'test-results/ephemeral',
  use: {
    baseURL: 'http://127.0.0.1:4280',
    testIdAttribute: 'data-automation-id',
    actionTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: 'node scripts/ephemeral/serve.mjs .ephemeral-site 4280',
    url: 'http://127.0.0.1:4280',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
