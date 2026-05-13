// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Azurite auto-start failure workspace creation E2E.
 *
 * Phase 4.9 uses this file with AZURITE_E2E_STEP=create to create the real
 * workspace through the Create Workspace webview. Debug assertion coverage lives
 * in azuriteAutostartFailureAssert.test.ts, which reopens the generated
 * workspace in a fresh VS Code session.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { By, Key, type WebDriver, type WebElement, VSBrowser, WebView, Workbench, until } from 'vscode-extension-tester';
import { dismissNotifications, sleep } from './helpers';

const TEST_TIMEOUT = 240_000;
const WORKSPACE_PARENT_DIR =
  process.env.AZURITE_E2E_WORKSPACE_PARENT ?? path.join(os.tmpdir(), 'la-e2e-test', 'azurite-autostart-failure-parent');
const WORKSPACE_NAME = 'azuritews';
const APP_NAME = 'azuriteapp';
const WORKFLOW_NAME = 'workflow1';
const WORKSPACE_DIR = path.join(WORKSPACE_PARENT_DIR, WORKSPACE_NAME);
const PROJECT_DIR = path.join(WORKSPACE_DIR, APP_NAME);
const WORKSPACE_FILE = path.join(WORKSPACE_DIR, `${WORKSPACE_NAME}.code-workspace`);
const E2E_STEP = (process.env.AZURITE_E2E_STEP || 'create').toLowerCase();

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function toXPathLiteral(value: string): string {
  if (!value.includes("'")) {
    return `'${value}'`;
  }

  if (!value.includes('"')) {
    return `"${value}"`;
  }

  const parts = value.split("'");
  return `concat(${parts
    .map((part, index) => {
      const literals = [];
      if (part) {
        literals.push(`'${part}'`);
      }
      if (index < parts.length - 1) {
        literals.push(`"'"`);
      }
      return literals.join(', ');
    })
    .filter(Boolean)
    .join(', ')})`;
}

async function selectCreateWorkspaceCommand(workbench: Workbench): Promise<void> {
  await dismissNotifications(workbench.getDriver());
  let input: Awaited<ReturnType<Workbench['openCommandPrompt']>> | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      input = await workbench.openCommandPrompt();
      await sleep(1000);
      await input.setText('> logic app workspace');
      await sleep(2000);
      break;
    } catch (error) {
      console.log(`[azurite-e2e] Create Workspace command input attempt ${attempt + 1}/3 failed: ${error}`);
      try {
        await input?.cancel();
      } catch {
        // Ignore cleanup failure; the next attempt reopens the command palette.
      }
      if (attempt === 2) {
        throw error;
      }
      await sleep(2000);
    }
  }

  if (!input) {
    throw new Error('Could not open command prompt');
  }

  let picks = await input.getQuickPicks();
  for (const pick of picks) {
    const label = await pick.getLabel();
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('workspace') && !lowerLabel.includes('package') && !lowerLabel.includes('from')) {
      console.log(`[azurite-e2e] Selecting create workspace command: "${label}"`);
      await pick.select();
      await sleep(2000);
      return;
    }
  }

  const labels: string[] = [];
  await input.setText('> Create new logic');
  await sleep(2000);
  picks = await input.getQuickPicks();
  for (const pick of picks) {
    const label = await pick.getLabel();
    labels.push(label);
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('workspace') && !lowerLabel.includes('package') && !lowerLabel.includes('from')) {
      console.log(`[azurite-e2e] Selecting create workspace command after retry: "${label}"`);
      await pick.select();
      await sleep(2000);
      return;
    }
  }

  await input.cancel();
  throw new Error(`Could not find Create Workspace command. Available picks: ${JSON.stringify(labels)}`);
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} did not complete within ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function switchToCreateWorkspaceWebview(driver: WebDriver): Promise<WebView> {
  await dismissNotifications(driver);
  await driver.switchTo().defaultContent();
  const outerFrame = await driver.wait(
    until.elementLocated(By.css("iframe[class='webview ready']")),
    60_000,
    'Create Workspace webview iframe not found'
  );
  await driver.switchTo().frame(outerFrame);
  const innerFrame = await driver.wait(until.elementLocated(By.id('active-frame')), 15_000, '#active-frame not found');
  await driver.switchTo().frame(innerFrame);
  await sleep(1000);
  return new WebView();
}

async function clearNotificationsAndReturnToCreateWorkspaceWebview(driver: WebDriver): Promise<WebView> {
  await driver.switchTo().defaultContent();
  await dismissNotifications(driver);
  try {
    await driver.executeScript(`
      document
        .querySelectorAll('.notifications-toasts .codicon-close, .notifications-toasts .codicon-notifications-clear-all')
        .forEach((button) => button.click());
    `);
  } catch {
    // Best-effort cleanup; the next frame switch still succeeds if nothing was present.
  }
  return await switchToCreateWorkspaceWebview(driver);
}

async function findInputByLabel(driver: WebDriver, labelText: string): Promise<WebElement> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const labels = await driver.findElements(By.xpath(`//label[contains(text(), ${toXPathLiteral(labelText)})]`));
    for (const label of labels) {
      const forAttr = await label.getAttribute('for');
      if (forAttr) {
        const inputs = await driver.findElements(By.id(forAttr));
        for (const input of inputs) {
          if (await input.isDisplayed().catch(() => false)) {
            return input;
          }
        }
      }
    }

    for (const label of labels) {
      const parent = await label.findElement(By.xpath('..'));
      const inputs = await parent.findElements(By.css('input'));
      for (const input of inputs) {
        if (await input.isDisplayed().catch(() => false)) {
          return input;
        }
      }
    }
    await sleep(500);
  }

  throw new Error(`Could not find input for label "${labelText}"`);
}

async function clearAndType(element: WebElement, text: string): Promise<void> {
  await element.click();
  await element.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
  await sleep(100);
  await element.sendKeys(text);
  await sleep(500);
}

async function selectRadioOption(driver: WebDriver, optionLabel: string): Promise<void> {
  const labels = await driver.findElements(By.xpath(`//label[contains(text(), ${toXPathLiteral(optionLabel)})]`));
  if (labels.length === 0) {
    throw new Error(`Radio option "${optionLabel}" not found`);
  }
  await labels[0].click();
  await sleep(500);
}

async function findDropdownByLabel(driver: WebDriver, labelText: string): Promise<WebElement> {
  const labels = await driver.findElements(By.xpath(`//label[contains(text(), ${toXPathLiteral(labelText)})]`));
  for (const label of labels) {
    const forAttr = await label.getAttribute('for');
    if (forAttr) {
      const buttons = await driver.findElements(By.id(forAttr));
      if (buttons.length > 0) {
        return buttons[0];
      }
    }
  }
  const comboboxes = await driver.findElements(By.css('button[role="combobox"]'));
  if (comboboxes.length > 0) {
    return comboboxes[comboboxes.length - 1];
  }
  throw new Error(`Could not find dropdown for label "${labelText}"`);
}

async function selectDropdownOption(driver: WebDriver, dropdown: WebElement, optionText: string): Promise<void> {
  await dropdown.click();
  await sleep(500);
  const options = await driver.findElements(By.css('[role="option"]'));
  for (const option of options) {
    const text = await option.getText();
    if (text.trim() === optionText) {
      await option.click();
      await sleep(500);
      return;
    }
  }
  throw new Error(`Dropdown option "${optionText}" not found`);
}

async function fillStandardWorkspaceWebviewForm(driver: WebDriver): Promise<void> {
  await clearAndType(await findInputByLabel(driver, 'Workspace parent folder path'), WORKSPACE_PARENT_DIR);
  await sleep(1500);
  await clearAndType(await findInputByLabel(driver, 'Workspace name'), WORKSPACE_NAME);
  await clearAndType(await findInputByLabel(driver, 'Logic app name'), APP_NAME);
  await selectRadioOption(driver, 'Logic app (Standard)');
  await clearAndType(await findInputByLabel(driver, 'Workflow name'), WORKFLOW_NAME);
  await selectDropdownOption(driver, await findDropdownByLabel(driver, 'Workflow type'), 'Stateful');
}

async function waitForNextButton(driver: WebDriver): Promise<WebElement> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const buttons = await driver.findElements(By.xpath("//button[contains(text(), 'Next')]"));
    for (const button of buttons) {
      const disabled = await button.getAttribute('disabled');
      const ariaDisabled = await button.getAttribute('aria-disabled');
      if (disabled !== 'true' && disabled !== '' && ariaDisabled !== 'true') {
        return button;
      }
    }
    await sleep(500);
  }
  throw new Error('Next button did not become enabled');
}

async function waitForCreateWorkspaceButton(driver: WebDriver): Promise<WebElement> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const buttons = await driver.findElements(By.xpath("//button[contains(text(), 'Create workspace')]"));
    for (const button of buttons) {
      const disabled = await button.getAttribute('disabled');
      const ariaDisabled = await button.getAttribute('aria-disabled');
      if (disabled !== 'true' && disabled !== '' && ariaDisabled !== 'true') {
        return button;
      }
    }
    await sleep(500);
  }
  throw new Error('Create workspace button not found');
}

async function createWorkspaceFromWebview(workbench: Workbench, driver: WebDriver): Promise<void> {
  await removeWorkspaceParent();
  fs.mkdirSync(WORKSPACE_PARENT_DIR, { recursive: true });

  await selectCreateWorkspaceCommand(workbench);
  let webview = await switchToCreateWorkspaceWebview(driver);
  await fillStandardWorkspaceWebviewForm(driver);
  webview = await clearNotificationsAndReturnToCreateWorkspaceWebview(driver);
  const nextButton = await waitForNextButton(driver);
  await driver.executeScript('arguments[0].click();', nextButton);
  await sleep(2000);

  webview = await clearNotificationsAndReturnToCreateWorkspaceWebview(driver);
  const createButton = await waitForCreateWorkspaceButton(driver);
  await driver.executeScript('arguments[0].click();', createButton);
  await sleep(15_000);
  try {
    await webview.switchBack();
  } catch {
    await driver.switchTo().defaultContent();
  }

  if (!fs.existsSync(WORKSPACE_FILE) || !fs.existsSync(PROJECT_DIR)) {
    throw new Error(`Create Workspace webview did not create expected workspace at ${WORKSPACE_FILE}`);
  }
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

async function removeWorkspaceParent(): Promise<void> {
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      fs.rmSync(WORKSPACE_PARENT_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
      return;
    } catch (error) {
      if (attempt === 8) {
        throw error;
      }
      await sleep(3000);
    }
  }
}

describe('Azurite auto-start failure E2E workspace creation', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;

  before(async function () {
    this.timeout(30_000);
    driver = VSBrowser.instance.driver;
  });

  after(async function () {
    this.timeout(30_000);
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
  });

  if (E2E_STEP === 'create') {
    it('creates a Logic Apps workspace through the Create Workspace webview', async function () {
      this.timeout(TEST_TIMEOUT);
      await withTimeout(createWorkspaceFromWebview(new Workbench(), driver), 180_000, 'Create Workspace webview flow');
      configureGeneratedWorkspaceForAzuriteFailure();
    });
  } else {
    it('is intentionally create-phase only', function () {
      console.log(
        `[azurite-e2e] Skipping AZURITE_E2E_STEP=${E2E_STEP}. Debug assertion coverage lives in azuriteAutostartFailureAssert.test.ts.`
      );
      this.skip();
    });
  }
});
