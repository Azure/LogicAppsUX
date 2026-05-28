/// <reference types="mocha" />

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { By, VSBrowser, type WebDriver } from 'vscode-extension-tester';
import { captureScreenshot, openFolderInSession, sleep } from './helpers';

const TEST_TIMEOUT = 120_000;
const NON_LOGIC_APP_DIR = path.join(os.tmpdir(), 'la-e2e-test', 'non-logic-app-startup');
const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'nonLogicAppStartup-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

const FORBIDDEN_STARTUP_TEXT = [
  'path argument must be of type string',
  'received undefined',
  'setting up dev containers',
  'you must open your workspace',
  'your logic app projects must exist inside a workspace',
];

function createPlainWorkspaceFolder(): void {
  fs.rmSync(NON_LOGIC_APP_DIR, { recursive: true, force: true });
  fs.mkdirSync(NON_LOGIC_APP_DIR, { recursive: true });
  fs.writeFileSync(path.join(NON_LOGIC_APP_DIR, 'package.json'), JSON.stringify({ name: 'non-logic-app-startup' }, null, 2));
  fs.writeFileSync(
    path.join(NON_LOGIC_APP_DIR, 'README.txt'),
    'Plain folder used to validate extension startup outside Logic App projects.'
  );
}

async function getVisibleStartupText(driver: WebDriver): Promise<string> {
  const domText = await driver
    .executeScript<string>(`
      const selectors = [
        '.notification-toast',
        '.notifications-toasts',
        '.notification-list-item',
        '.monaco-dialog-box',
        '[role="dialog"]',
        '.quick-input-widget:not(.hidden)'
      ];
      return Array.from(document.querySelectorAll(selectors.join(',')))
        .map((element) => element.textContent || '')
        .join('\\n');
    `)
    .catch(() => '');

  const modalTexts: string[] = [];
  try {
    const dialogs = await driver.findElements(By.css('.monaco-dialog-box, [role="dialog"]'));
    for (const dialog of dialogs) {
      modalTexts.push(await dialog.getText().catch(() => ''));
    }
  } catch {
    // No dialogs are visible.
  }

  return [domText, ...modalTexts].filter(Boolean).join('\n');
}

async function waitForForbiddenStartupText(driver: WebDriver, timeoutMs = 20_000): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const visibleText = await getVisibleStartupText(driver);
    const normalizedText = visibleText.toLowerCase();
    const matchedText = FORBIDDEN_STARTUP_TEXT.find((text) => normalizedText.includes(text));
    if (matchedText) {
      return `${matchedText}: ${visibleText}`;
    }
    await sleep(1000);
  }

  return undefined;
}

describe('Non-Logic-App startup', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;

  before(async function () {
    this.timeout(60_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
    createPlainWorkspaceFolder();
    driver = VSBrowser.instance.driver;
  });

  after(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        fs.rmSync(NON_LOGIC_APP_DIR, { recursive: true, force: true });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[nonLogicAppStartup] Cleanup attempt ${attempt}/3 failed: ${message}`);
        await sleep(1000);
      }
    }
  });

  it('starts in a plain folder without dependency path or Dev Containers errors', async () => {
    await openFolderInSession(driver, NON_LOGIC_APP_DIR);
    await captureScreenshot(driver, 'non-logic-app-startup-opened', EXPLICIT_SCREENSHOT_DIR);

    const forbiddenText = await waitForForbiddenStartupText(driver);
    assert.strictEqual(forbiddenText, undefined, `Unexpected startup UI appeared: ${forbiddenText}`);
  });
});
