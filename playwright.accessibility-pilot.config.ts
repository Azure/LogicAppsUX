import { defineConfig, devices } from '@playwright/test';

const outputDir = process.env.LAUX_ACCESSIBILITY_OUTPUT_DIR ?? './accessibility-pilot/artifacts/test-results';
const reportFile = process.env.LAUX_ACCESSIBILITY_PLAYWRIGHT_JSON ?? './accessibility-pilot/artifacts/playwright-report.json';

export default defineConfig({
  testDir: './accessibility-pilot/tests',
  outputDir,
  retries: 0,
  workers: 1,
  forbidOnly: true,
  reporter: [['line'], ['json', { outputFile: reportFile }]],
  use: {
    ...devices['Desktop Chrome'],
    offline: true,
    serviceWorkers: 'block',
  },
});
