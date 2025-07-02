// Configuration for WebDriverIO tests
import path from 'path';
import { fileURLToPath } from 'url';
import type { Options } from '@wdio/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config: Options.Testrunner = {
  runner: 'local',

  // Specs defines which test files to run
  specs: ['./specs/**/*.e2e.ts'],

  // Exclude patterns
  exclude: [],

  // Maximum number of total parallel running workers
  maxInstances: 1,

  // Capabilities
  capabilities: [
    {
      browserName: 'vscode',
      browserVersion: 'stable', // Use stable VS Code version
      'wdio:vscodeOptions': {
        extensionPath: path.join(__dirname, '..'),
        // Create a test workspace directory if needed
        workspacePath: path.join(__dirname, '..', 'test-workspace'),

        // Headless mode for CI/automated testing
        headless: true,

        // VS Code user settings for testing
        userSettings: {
          'workbench.startupEditor': 'none',
          'workbench.colorTheme': 'Default Light+',
          'editor.fontSize': 14,
          'window.titleBarStyle': 'custom',
          // Extension-specific settings
          'logicAppsStandard.showPreviewWarning': false,
          'logicAppsStandard.requestTimeout': 30000,
        },
        // VS Code CLI arguments for headless mode
        vscodeArgs: [
          '--disable-extensions', // Disable other extensions during testing
          '--skip-welcome',
          '--skip-release-notes',
          '--disable-workspace-trust', // Skip workspace trust dialog
        ],
      },
    },
  ],

  // Test configuration
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // Services
  services: ['vscode'],

  // Framework
  framework: 'mocha',

  // Reporter configuration
  reporters: [
    'spec',
    [
      'json',
      {
        outputDir: './test/results',
        outputFileFormat: (options: any) => `results-${options.cid}.json`,
      },
    ],
  ],

  // Mocha options
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000, // 2 minutes timeout for VS Code operations
    retries: 2,
  },

  // Hooks
  before: async () => {
    // Set up test environment before tests start
    console.log('Setting up VS Code extension test environment...');
  },

  beforeTest: async (test, _context) => {
    console.log(`Starting test: ${test.title}`);
  },

  afterTest: async (test, _context, { error, result: _result, duration: _duration, passed: _passed, retries: _retries }) => {
    if (error) {
      console.log(`Test failed: ${test.title} - ${error.message}`);
      // Take screenshot on failure
      await browser.saveScreenshot(`./test/screenshots/failed-${test.title.replace(/\s+/g, '-')}-${Date.now()}.png`);
    }
  },

  after: async () => {
    console.log('Cleaning up test environment...');
  },
};
