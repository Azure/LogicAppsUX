process.env.NODE_ENV = 'development'; // Set before importing Playwright

import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { designerStorageState } from './e2e/designer/designerStorageState';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['designer/**/*.spec.ts', 'templates/**/*.spec.ts'],
  globalSetup: './e2e/designer/globalSetup.ts',
  reporter: process.env.TEST_SHARDED ? 'blob' : 'html',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: process.env.CI ? 2 : '50%',
  timeout: 5 * 60 * 1_000,
  expect: {
    timeout: 20 * 1000,
  },
  reportSlowTests: {
    threshold: 60 * 1_000,
    max: 10,
  },
  use: {
    testIdAttribute: 'data-automation-id',
    actionTimeout: 20 * 1_000,
    baseURL: 'http://localhost:4200',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    storageState: designerStorageState,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm run start:e2e',
    url: 'http://localhost:4200/',
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
  },
});
