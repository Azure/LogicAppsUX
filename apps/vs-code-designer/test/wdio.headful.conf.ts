import { config as baseConfig } from './wdio.conf.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Options } from '@wdio/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config: Options.Testrunner = {
  ...baseConfig,

  // Override capabilities for headful mode
  capabilities: [
    {
      browserName: 'vscode',
      browserVersion: 'stable',
      'wdio:vscodeOptions': {
        extensionPath: path.join(__dirname, '..'),
        workspacePath: path.join(__dirname, '..', 'test-workspace'),

        // Headful mode settings - VS Code will be visible
        headless: false,

        // User settings for better visibility during testing
        userSettings: {
          'workbench.startupEditor': 'none',
          'workbench.colorTheme': 'Default Light+',
          'editor.fontSize': 16, // Larger font for better visibility
          'window.titleBarStyle': 'custom',
          'workbench.activityBar.visible': true,
          'workbench.statusBar.visible': true,
          'workbench.sideBar.location': 'left',
          // Extension-specific settings
          'logicAppsStandard.showPreviewWarning': false,
          'logicAppsStandard.requestTimeout': 30000,
          // Enable all panels for better testing visibility
          'workbench.panel.defaultLocation': 'bottom',
          'workbench.editor.showTabs': 'multiple',
        },

        // VS Code CLI arguments for headful mode
        vscodeArgs: [
          '--disable-extensions', // Disable other extensions during testing
          '--skip-welcome',
          '--skip-release-notes',
          '--new-window', // Open in new window
          // Enable dev tools for debugging if needed
          // '--enable-dev-tools'
        ],

        // Keep VS Code open longer for observation
        timeout: 300000, // 5 minutes
      },
    },
  ],

  // Increase timeouts for headful mode (so you can observe)
  waitforTimeout: 60000, // 1 minute
  connectionRetryTimeout: 180000, // 3 minutes

  // Mocha options with longer timeouts for observation
  mochaOpts: {
    ...baseConfig.mochaOpts,
    timeout: 300000, // 5 minutes timeout for observation
    retries: 1, // Fewer retries in headful mode
  },

  // Additional hooks for headful mode
  beforeTest: async (test, _context) => {
    console.log(`\n🔍 Starting test: ${test.title}`);
    console.log('📋 You can now observe the VS Code window...');

    // Add a small delay to let you see what's happening
    await browser.pause(2000);
  },

  afterTest: async (test, _context, { error, result: _result, duration: _duration, passed: _passed, retries: _retries }) => {
    if (error) {
      console.log(`❌ Test failed: ${test.title}`);
      console.log('💡 You can inspect the VS Code window to debug the issue');

      // Take screenshot and pause for inspection
      await browser.saveScreenshot(`./test/screenshots/failed-${test.title.replace(/\s+/g, '-')}-${Date.now()}.png`);

      // Pause longer on failure for debugging
      console.log('⏸️  Pausing for 10 seconds for inspection...');
      await browser.pause(10000);
    } else {
      console.log(`✅ Test passed: ${test.title} (${duration}ms)`);
      await browser.pause(1000); // Brief pause to observe success
    }
  },
};
