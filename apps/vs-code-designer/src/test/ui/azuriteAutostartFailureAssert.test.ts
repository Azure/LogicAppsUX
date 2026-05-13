// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Azurite auto-start failure assertion E2E.
 *
 * This runs in a fresh VS Code session after azuriteAutostartFailure.test.ts
 * creates the workspace through the Create Workspace webview.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { Key, type WebDriver, VSBrowser, Workbench } from 'vscode-extension-tester';
import { captureScreenshot, sleep } from './helpers';
import { startDebugging } from './runHelpers';

const TEST_TIMEOUT = 240_000;
const AZURITE_TIMEOUT_TEXT = 'Azurite did not become ready';
const AZURE_WEB_JOBS_STORAGE_TEXT = 'Failed to verify "AzureWebJobsStorage" connection';
const DEBUG_ANYWAY_TEXT = 'Debug anyway';
const WORKSPACE_PARENT_DIR =
  process.env.AZURITE_E2E_WORKSPACE_PARENT ?? path.join(os.tmpdir(), 'la-e2e-test', 'azurite-autostart-failure-parent');
const WORKSPACE_NAME = 'azuritews';
const APP_NAME = 'azuriteapp';
const WORKSPACE_DIR = path.join(WORKSPACE_PARENT_DIR, WORKSPACE_NAME);
const PROJECT_DIR = path.join(WORKSPACE_DIR, APP_NAME);
const WORKSPACE_FILE = path.join(WORKSPACE_DIR, `${WORKSPACE_NAME}.code-workspace`);
const DESIGN_TIME_DIR = path.join(PROJECT_DIR, 'workflow-designtime');
const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  'azuriteAutostartFailure-explicit',
  new Date().toISOString().replace(/[:.]/g, '-')
);

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function configureGeneratedWorkspaceForAzuriteFailure(): void {
  const workspaceJson = readJson(WORKSPACE_FILE);
  workspaceJson.settings = {
    ...(workspaceJson.settings ?? {}),
    'azureLogicAppsStandard.autoStartAzurite': true,
    'azureLogicAppsStandard.showAutoStartAzuriteWarning': false,
    'azureLogicAppsStandard.autoStartDesignTime': true,
    'azureLogicAppsStandard.showStartDesignTimeMessage': false,
    'azureLogicAppsStandard.showProjectWarning': false,
    'azureLogicAppsStandard.verifyConnectionKeys': false,
    'azureFunctions.suppressProject': true,
    'debug.internalConsoleOptions': 'neverOpen',
  };
  writeJson(WORKSPACE_FILE, workspaceJson);

  const settingsPath = path.join(PROJECT_DIR, '.vscode', 'settings.json');
  const settingsJson = fs.existsSync(settingsPath) ? readJson(settingsPath) : {};
  writeJson(settingsPath, {
    ...settingsJson,
    'azureLogicAppsStandard.autoStartAzurite': true,
    'azureLogicAppsStandard.showAutoStartAzuriteWarning': false,
    'azureLogicAppsStandard.autoStartDesignTime': true,
    'azureLogicAppsStandard.showStartDesignTimeMessage': false,
    'azureLogicAppsStandard.showProjectWarning': false,
    'azureLogicAppsStandard.verifyConnectionKeys': false,
    'azureFunctions.suppressProject': true,
    'debug.internalConsoleOptions': 'neverOpen',
  });

  const launchPath = path.join(PROJECT_DIR, '.vscode', 'launch.json');
  writeJson(launchPath, {
    version: '0.2.0',
    configurations: [
      {
        name: `Run/Debug logic app ${APP_NAME}`,
        type: 'logicapp',
        request: 'launch',
        funcRuntime: 'coreclr',
        isCodeless: true,
      },
    ],
  });

  const localSettingsPath = path.join(PROJECT_DIR, 'local.settings.json');
  const localSettingsJson = readJson(localSettingsPath);
  localSettingsJson.Values = {
    ...(localSettingsJson.Values ?? {}),
    AzureWebJobsStorage: 'UseDevelopmentStorage=true',
    WORKFLOWS_SUBSCRIPTION_ID: '',
    WORKFLOWS_TENANT_ID: '',
    WORKFLOWS_RESOURCE_GROUP_NAME: '',
    WORKFLOWS_LOCATION_NAME: '',
  };
  writeJson(localSettingsPath, localSettingsJson);
}

async function bindPort(port: number): Promise<http.Server> {
  return await new Promise((resolve, reject) => {
    const server = http.createServer((_, response) => {
      response.statusCode = 403;
      response.setHeader('Connection', 'close');
      response.end('Azurite blocked by E2E test');
    });
    server.requestTimeout = 1000;
    server.headersTimeout = 1000;
    server.keepAliveTimeout = 1000;
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

async function blockAzuritePorts(): Promise<http.Server[]> {
  const servers: http.Server[] = [];
  for (const port of [10000, 10001, 10002]) {
    try {
      servers.push(await bindPort(port));
      console.log(`[azurite-e2e] Bound local port ${port}`);
    } catch (error) {
      for (const server of servers) {
        server.close();
      }
      throw new Error(`Unable to bind Azurite port ${port}. Stop any local Azurite instance and retry. ${error}`);
    }
  }
  return servers;
}

async function closeServers(servers: http.Server[]): Promise<void> {
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 1000);
          server.close(() => {
            clearTimeout(timeout);
            resolve();
          });
        })
    )
  );
}

async function getVisibleWorkbenchText(driver: WebDriver): Promise<string> {
  return await driver.executeScript<string>(`
    const selectors = [
      '.monaco-dialog-box',
      '[role="dialog"]',
      '.notification-toast',
      '.notifications-toasts',
      '.quick-input-widget:not(.hidden)',
      '.monaco-workbench'
    ];
    return selectors
      .flatMap((sel) => Array.from(document.querySelectorAll(sel)))
      .map((el) => el.textContent || '')
      .join('\\n');
  `);
}

async function focusTerminalPanel(driver: WebDriver): Promise<void> {
  try {
    await driver.actions().keyDown(Key.CONTROL).sendKeys('`').keyUp(Key.CONTROL).perform();
    await sleep(1000);
    await driver.actions().sendKeys(Key.ESCAPE).perform();
  } catch (error) {
    console.log(`[azurite-e2e] Could not focus terminal panel: ${error}`);
  }
}

async function getPanelDiagnostics(driver: WebDriver): Promise<string> {
  return await driver.executeScript<string>(`
    const selectors = [
      '.terminal-wrapper',
      '.xterm-screen',
      '.xterm-rows',
      '.panel .monaco-list',
      '.output-view',
      '.notifications-toasts',
      '[role="dialog"]',
      '.quick-input-widget:not(.hidden)'
    ];
    return selectors
      .map((sel) => {
        const text = Array.from(document.querySelectorAll(sel)).map((el) => el.textContent || '').join('\\n');
        return text ? '--- ' + sel + ' ---\\n' + text : '';
      })
      .filter(Boolean)
      .join('\\n');
  `);
}

async function logPanelDiagnostics(driver: WebDriver, label: string): Promise<void> {
  try {
    await driver.switchTo().defaultContent();
    const diagnostics = await getPanelDiagnostics(driver);
    console.log(`[azurite-e2e] ${label} diagnostics:\n${diagnostics || '<empty>'}`);
  } catch (error) {
    console.log(`[azurite-e2e] Failed to capture ${label} diagnostics: ${error}`);
  }
}

function logLatestLogicAppsOutput(label: string): void {
  try {
    const logsRoot = path.join(os.tmpdir(), 'test-resources', 'settings', 'logs');
    if (!fs.existsSync(logsRoot)) {
      console.log(`[azurite-e2e] ${label} output log: logs root does not exist`);
      return;
    }

    const matches: string[] = [];
    const collect = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          collect(entryPath);
        } else if (entry.name.includes('Azure Logic Apps') && entry.name.endsWith('.log')) {
          matches.push(entryPath);
        }
      }
    };
    collect(logsRoot);

    const latest = matches
      .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
      .sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.filePath;

    if (!latest) {
      console.log(`[azurite-e2e] ${label} output log: no Azure Logic Apps output log found`);
      return;
    }

    const content = fs.readFileSync(latest, 'utf-8');
    console.log(`[azurite-e2e] ${label} output log (${latest}):\n${content.slice(-6000)}`);
  } catch (error) {
    console.log(`[azurite-e2e] Failed to read ${label} output log: ${error}`);
  }
}

async function waitForWorkbenchText(driver: WebDriver, text: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const visibleText = await getVisibleWorkbenchText(driver);
    if (visibleText.includes(text)) {
      return true;
    }
    await sleep(500);
  }
  return false;
}

async function assertTextDoesNotAppear(driver: WebDriver, text: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const visibleText = await getVisibleWorkbenchText(driver);
    assert.ok(!visibleText.includes(text), `Unexpected workbench text appeared: ${text}`);
    await sleep(500);
  }
}

async function isDebugToolbarVisible(driver: WebDriver): Promise<boolean> {
  return await driver.executeScript<boolean>(`
    const toolbar = document.querySelector('.debug-toolbar, [class*="debug-toolbar"], [class*="debugging-actions"]');
    if (!toolbar) {
      return false;
    }
    const style = window.getComputedStyle(toolbar);
    return style.display !== 'none' && style.visibility !== 'hidden';
  `);
}

async function waitForWorkspaceOpen(driver: WebDriver): Promise<void> {
  const deadline = Date.now() + 45_000;
  let lastTitle = '';
  let lastExplorerState = '';

  while (Date.now() < deadline) {
    await driver
      .switchTo()
      .defaultContent()
      .catch(() => undefined);
    lastTitle = await driver.getTitle().catch(() => '');
    lastExplorerState = await driver
      .executeScript<string>(
        `
          const rows = document.querySelectorAll('.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row');
          return Array.from(rows).map((row) => row.textContent || '').join('\\n');
        `
      )
      .catch(() => '');

    const title = lastTitle.toLowerCase();
    const explorer = lastExplorerState.toLowerCase();
    if (title.includes(WORKSPACE_NAME) || explorer.includes(WORKSPACE_NAME) || explorer.includes(APP_NAME)) {
      return;
    }

    await sleep(1000);
  }

  await captureScreenshot(driver, 'azurite-workspace-not-open', EXPLICIT_SCREENSHOT_DIR);
  throw new Error(
    `Generated workspace did not open in fresh session: ${WORKSPACE_FILE}. Title="${lastTitle}", Explorer="${lastExplorerState.substring(
      0,
      200
    )}"`
  );
}

async function waitForDesignTimeFolder(): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(DESIGN_TIME_DIR)) {
      return;
    }
    await sleep(1000);
  }
  throw new Error(`Expected design-time startup to create ${DESIGN_TIME_DIR}`);
}

describe('Azurite auto-start failure E2E assertion', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let portBlockers: http.Server[] = [];

  before(async function () {
    this.timeout(30_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
    driver = VSBrowser.instance.driver;
  });

  after(async function () {
    this.timeout(30_000);
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    await closeServers(portBlockers);
  });

  it('stops debug after Azurite auto-start failure without showing AzureWebJobsStorage warning', async function () {
    this.timeout(TEST_TIMEOUT);
    assert.ok(fs.existsSync(WORKSPACE_FILE), `Expected generated workspace file to exist: ${WORKSPACE_FILE}`);
    configureGeneratedWorkspaceForAzuriteFailure();
    await waitForWorkspaceOpen(driver);
    await waitForDesignTimeFolder();
    console.log(`[azurite-e2e] Design-time folder exists: ${DESIGN_TIME_DIR}`);
    await sleep(3000);

    const workbench = new Workbench();
    await focusTerminalPanel(driver);
    await logPanelDiagnostics(driver, 'before debug');
    portBlockers = await blockAzuritePorts();
    await startDebugging(workbench, driver);
    await focusTerminalPanel(driver);
    await logPanelDiagnostics(driver, 'after debug command');
    logLatestLogicAppsOutput('after debug command');

    const sawAzuriteFailure = await waitForWorkbenchText(driver, AZURITE_TIMEOUT_TEXT, 45_000);
    if (!sawAzuriteFailure) {
      await focusTerminalPanel(driver);
      await logPanelDiagnostics(driver, 'missing Azurite failure');
      logLatestLogicAppsOutput('missing Azurite failure');
      await captureScreenshot(driver, 'azurite-failure-message-not-found', EXPLICIT_SCREENSHOT_DIR);
    }
    assert.ok(sawAzuriteFailure, 'Expected Azurite auto-start timeout to be visible');

    await assertTextDoesNotAppear(driver, AZURE_WEB_JOBS_STORAGE_TEXT, 20_000);
    await assertTextDoesNotAppear(driver, DEBUG_ANYWAY_TEXT, 5_000);
    assert.strictEqual(await isDebugToolbarVisible(driver), false, 'Debug toolbar should not be visible after Azurite auto-start failure');
  });
});
