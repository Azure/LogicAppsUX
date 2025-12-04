process.env.NODE_ENV = 'development'; // Set before importing Playwright

import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './e2e/chatClient',
  reporter: process.env.TEST_SHARDED ? 'blob' : 'html',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 3,
  workers: '50%',
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
    baseURL: 'http://localhost:3001',
    video: 'on-first-retry',
    trace: 'on',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] },
    },
  ],

  /* Run the chat client dev server before starting the tests */
  webServer: {
    command: 'pnpm --filter @microsoft/logic-apps-chat run build && pnpm --filter @a2achat/iframe-app run e2e',
    url: 'http://localhost:3001/',
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
  },
});
