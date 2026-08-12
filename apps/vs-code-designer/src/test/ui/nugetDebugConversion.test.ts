// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Regression coverage for issue #7040:
 *   1. F5 a bundle-based Standard project.
 *   2. Stop debugging, then convert the same project to NuGet.
 *   3. F5 again without the E2E harness' pre-F5 port cleanup.
 *
 * The second F5 intentionally bypasses runHelpers.startDebugging() so a stale
 * pre-conversion func host is cleaned by product code, not by the test harness.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EditorView, Key, type WebDriver, Workbench } from 'vscode-extension-tester';
import { clearBlockingUI, pushDialogButtonWithRetry, sleep, waitForQuickInputAndType } from './helpers';
import { openWorkspaceFileInSession, waitForDependencyValidation } from './designerHelpers';
import {
  assertRunTriggerable,
  clickLatestRunRow,
  clickRefresh,
  invokeWorkflowCallback,
  startDebugging,
  stopDebugging,
  verifyAllNodesSucceeded,
  waitForOverviewView,
  waitForRunStatusInList,
  waitForRuntimeReady,
} from './runHelpers';
import { loadWorkspaceManifest, type WorkspaceManifestEntry } from './workspaceManifest';

const TEST_TIMEOUT = 900_000;
const RUNTIME_READY_TIMEOUT = 420_000;
const COMMAND_TIMEOUT = 30_000;
const CONVERSION_TIMEOUT = 90_000;
const MOVE_BUTTON_LABEL = 'Move to a NuGet-based project';
const CONVERT_COMMAND_TITLE = 'Convert to NuGet-based logic app project';
const STALE_FUNC_HOST_FAILURE_PATTERNS = [/Failed to stop previous running Functions host/i, /Failed to detect running Functions host/i];
const POST_CONVERSION_PROMPT_FAILURE_PATTERNS = [/Detected out of date \.vscode configuration files/i];

interface TasksJson {
  tasks?: Array<{
    label?: string;
    command?: string;
    args?: string[];
    type?: string;
    dependsOn?: string | string[];
    group?: { kind?: string; isDefault?: boolean };
    options?: { cwd?: string; env?: Record<string, string> };
    windows?: { options?: { cwd?: string; env?: Record<string, string> } };
    linux?: { options?: { cwd?: string; env?: Record<string, string> } };
    osx?: { options?: { cwd?: string; env?: Record<string, string> } };
  }>;
  inputs?: Array<{ id?: string; type?: string; command?: string }>;
}

interface LaunchJson {
  configurations?: Array<{
    name?: string;
    request?: string;
    processId?: string;
    type?: string;
    funcRuntime?: string;
    isCodeless?: boolean;
  }>;
}

interface WorkflowJson {
  definition?: {
    triggers?: Record<string, { type?: string; kind?: string }>;
    actions?: Record<string, { type?: string; kind?: string }>;
  };
  kind?: string;
}

interface SettingsJson {
  'azureLogicAppsStandard.deploySubpath'?: string;
  'azureLogicAppsStandard.projectLanguage'?: string;
  'azureLogicAppsStandard.projectRuntime'?: string;
  'debug.internalConsoleOptions'?: string;
  'azureFunctions.suppressProject'?: boolean;
  'azureLogicAppsStandard.preDeployTask'?: string;
  [key: string]: unknown;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) as T;
}

function getStandardStatefulEntry(): WorkspaceManifestEntry {
  const entry = loadWorkspaceManifest().find((candidate) => candidate.appType === 'standard' && candidate.wfType === 'Stateful');
  assert.ok(entry, 'Standard + Stateful workspace fixture must exist in the workspace manifest');
  return entry;
}

function cloneWorkspaceFixture(entry: WorkspaceManifestEntry): WorkspaceManifestEntry {
  const cloneName = `${entry.wsName}_nugetdebug_${Date.now()}`;
  const cloneRoot = path.join(os.tmpdir(), 'la-e2e-nuget-debug', cloneName);
  fs.rmSync(cloneRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(cloneRoot), { recursive: true });
  fs.cpSync(entry.wsDir, cloneRoot, { recursive: true });

  const originalWorkspaceFile = path.join(cloneRoot, path.basename(entry.wsFilePath));
  const clonedWorkspaceFile = path.join(cloneRoot, `${cloneName}.code-workspace`);
  fs.renameSync(originalWorkspaceFile, clonedWorkspaceFile);
  const workspaceFile = readJsonFile<{ settings?: Record<string, unknown> }>(clonedWorkspaceFile);
  workspaceFile.settings = {
    ...(workspaceFile.settings ?? {}),
    'azureLogicAppsStandard.pickProcessTimeout': 120,
  };
  fs.writeFileSync(clonedWorkspaceFile, `${JSON.stringify(workspaceFile, undefined, 2)}\n`);

  const appDir = path.join(cloneRoot, entry.appName);
  const localSettingsPath = path.join(appDir, 'local.settings.json');
  if (fs.existsSync(localSettingsPath)) {
    const localSettings = readJsonFile<{ Values?: Record<string, unknown> }>(localSettingsPath);
    localSettings.Values = {
      ...(localSettings.Values ?? {}),
      ProjectDirectoryPath: appDir,
      WORKFLOWS_SUBSCRIPTION_ID: '',
    };
    fs.writeFileSync(localSettingsPath, `${JSON.stringify(localSettings, undefined, 2)}\n`);
  }

  return {
    ...entry,
    wsName: cloneName,
    wsDir: cloneRoot,
    wsFilePath: clonedWorkspaceFile,
    appDir,
    wfDir: path.join(cloneRoot, entry.appName, entry.wfName),
  };
}

async function runCommandFromPalette(driver: WebDriver, commandTitle: string, timeoutMs = COMMAND_TIMEOUT): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastLabels: string[] = [];

  console.log(`[nugetDebugConversion] Opening command palette for: "${commandTitle}"`);
  while (Date.now() < deadline) {
    try {
      await driver.switchTo().defaultContent();
      await clearBlockingUI(driver);

      await driver.actions().keyDown(Key.CONTROL).keyDown(Key.SHIFT).sendKeys('p').keyUp(Key.SHIFT).keyUp(Key.CONTROL).perform();
      await waitForQuickInputAndType(driver, `> ${commandTitle}`);

      const pickDeadline = Date.now() + 10_000;
      while (Date.now() < pickDeadline) {
        const result = await driver.executeScript<{ clicked: boolean; labels: string[]; selected?: string }>(
          `
          const commandTitle = arguments[0].toLowerCase();
          const rows = Array.from(document.querySelectorAll('.quick-input-list .monaco-list-row, .quick-input-widget .monaco-list-row'));
          const labels = rows.map((row) => (row.textContent || '').trim()).filter(Boolean);
          for (const row of rows) {
            const label = (row.textContent || '').trim();
            if (label.toLowerCase().includes(commandTitle)) {
              row.click();
              return { clicked: true, labels, selected: label };
            }
          }
          return { clicked: false, labels };
        `,
          commandTitle
        );
        lastLabels = result.labels;
        if (result.clicked) {
          console.log(`[nugetDebugConversion] Selecting command: "${result.selected ?? commandTitle}"`);
          return;
        }
        await sleep(500);
      }
    } catch (error: any) {
      const firstLine = error?.message?.split('\n')[0] ?? error?.message ?? 'unknown';
      console.log(`[nugetDebugConversion] Command palette attempt failed for "${commandTitle}": ${firstLine}`);
      await driver
        .actions()
        .sendKeys('\uE00C')
        .perform()
        .catch(() => undefined);
    }

    await sleep(1000);
  }

  throw new Error(`Command "${commandTitle}" not found. Last quick picks: ${lastLabels.join(' | ')}`);
}

async function waitForDialogText(driver: WebDriver, pattern: RegExp, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await driver
      .switchTo()
      .defaultContent()
      .catch(() => undefined);
    const found = await driver
      .executeScript<boolean>(
        `
        const pattern = new RegExp(arguments[0], 'i');
        const els = Array.from(document.querySelectorAll('[role="dialog"], .monaco-dialog-box, .notification-toast'));
        return els.some((el) => pattern.test(el.textContent || ''));
      `,
        pattern.source
      )
      .catch(() => false);
    if (found) {
      return;
    }
    await sleep(1000);
  }

  throw new Error(`Timed out waiting for dialog matching ${pattern}`);
}

async function waitForFilePredicate(filePath: string, predicate: () => boolean, timeoutMs: number, description: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath) && predicate()) {
      return;
    }
    await sleep(1000);
  }

  throw new Error(`Timed out waiting for ${description}: ${filePath}`);
}

async function confirmVSCodeRegenerationIfVisible(driver: WebDriver): Promise<boolean> {
  await driver
    .switchTo()
    .defaultContent()
    .catch(() => undefined);

  const clicked = await driver
    .executeScript<boolean>(`
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .monaco-dialog-box'));
      for (const dialog of dialogs) {
        const text = dialog.textContent || '';
        if (!text.includes('The .vscode configuration files will be regenerated to match the current project settings')) {
          continue;
        }

        const buttons = Array.from(dialog.querySelectorAll('button'));
        const yesButton = buttons.find((button) => (button.textContent || '').trim() === 'Yes');
        if (yesButton instanceof HTMLElement) {
          yesButton.click();
          return true;
        }
      }
      return false;
    `)
    .catch(() => false);

  if (clicked) {
    console.log('[nugetDebugConversion] Confirmed .vscode regeneration prompt');
    await sleep(1000);
    return true;
  }

  try {
    await pushDialogButtonWithRetry(driver, 'Yes', 1);
    console.log('[nugetDebugConversion] Confirmed .vscode regeneration prompt via ModalDialog');
    await sleep(1000);
    return true;
  } catch {
    return false;
  }
}

async function confirmVSCodeRegenerationPrompt(driver: WebDriver): Promise<void> {
  const deadline = Date.now() + COMMAND_TIMEOUT;
  while (Date.now() < deadline) {
    if (await confirmVSCodeRegenerationIfVisible(driver)) {
      return;
    }
    await sleep(500);
  }

  throw new Error('Timed out waiting for .vscode regeneration confirmation prompt');
}

async function waitForExactNugetDebugFiles(entry: WorkspaceManifestEntry, driver: WebDriver): Promise<void> {
  const deadline = Date.now() + CONVERSION_TIMEOUT;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      assertNugetDebugFiles(entry);
      return;
    } catch (error) {
      lastError = error;
    }
    await confirmVSCodeRegenerationIfVisible(driver);
    await sleep(1000);
  }

  throw new Error(
    `Timed out waiting for exact converted NuGet .vscode files: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

function seedBundleProjectFilesIfNeeded(entry: WorkspaceManifestEntry): void {
  const hostJsonPath = path.join(entry.appDir, 'host.json');
  const tasksJsonPath = path.join(entry.appDir, '.vscode', 'tasks.json');
  const launchJsonPath = path.join(entry.appDir, '.vscode', 'launch.json');

  fs.mkdirSync(path.dirname(tasksJsonPath), { recursive: true });
  if (!fs.existsSync(hostJsonPath)) {
    fs.writeFileSync(hostJsonPath, `${JSON.stringify({ version: '2.0' }, undefined, 2)}\n`);
  }
  fs.writeFileSync(
    tasksJsonPath,
    `${JSON.stringify(
      {
        version: '2.0.0',
        tasks: [
          {
            label: 'generateDebugSymbols',
            command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
            args: ['${input:getDebugSymbolDll}'],
            type: 'process',
            problemMatcher: '$msCompile',
          },
          {
            type: 'shell',
            command: '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}',
            args: ['host', 'start'],
            problemMatcher: '$func-watch',
            isBackground: true,
            label: 'func: host start',
            group: {
              kind: 'build',
              isDefault: true,
            },
          },
        ],
        inputs: [
          {
            id: 'getDebugSymbolDll',
            type: 'command',
            command: 'azureLogicAppsStandard.getDebugSymbolDll',
          },
        ],
      },
      undefined,
      2
    )}\n`
  );
  fs.writeFileSync(
    launchJsonPath,
    `${JSON.stringify(
      {
        version: '0.2.0',
        configurations: [
          {
            name: `Run/Debug logic app ${entry.appName}`,
            type: 'coreclr',
            request: 'attach',
            processId: '${command:azureLogicAppsStandard.pickFuncProcess}',
          },
        ],
      },
      undefined,
      2
    )}\n`
  );
  fs.mkdirSync(path.join(entry.appDir, 'workflow-designtime'), { recursive: true });
}

function seedRunnableWorkflow(entry: WorkspaceManifestEntry): void {
  const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
  fs.mkdirSync(path.dirname(workflowJsonPath), { recursive: true });
  fs.writeFileSync(
    workflowJsonPath,
    `${JSON.stringify(
      {
        definition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          triggers: {
            manual: {
              type: 'Request',
              kind: 'Http',
              inputs: {
                schema: {
                  type: 'object',
                },
              },
            },
          },
          actions: {
            Response: {
              type: 'Response',
              kind: 'Http',
              inputs: {
                statusCode: 200,
                body: 'nuget-debug-conversion-ok',
              },
              runAfter: {},
            },
          },
          outputs: {},
        },
        kind: 'Stateful',
      },
      undefined,
      2
    )}\n`
  );
}

function assertRunnableWorkflow(entry: WorkspaceManifestEntry, phase: string): void {
  const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
  assert.ok(fs.existsSync(workflowJsonPath), `${phase}: workflow.json should exist`);

  const workflowJson = readJsonFile<WorkflowJson>(workflowJsonPath);
  const triggers = workflowJson.definition?.triggers ?? {};
  const actions = workflowJson.definition?.actions ?? {};
  const triggerEntries = Object.entries(triggers);
  const actionEntries = Object.entries(actions);

  assert.ok(triggerEntries.length > 0, `${phase}: workflow should have at least one trigger`);
  assert.ok(actionEntries.length > 0, `${phase}: workflow should have at least one action`);
  assert.strictEqual(triggers.manual?.type, 'Request', `${phase}: workflow should use the built-in Request trigger`);
  assert.strictEqual(actions.Response?.type, 'Response', `${phase}: workflow should use the built-in Response action`);
}

function getExpectedConvertedNugetTasksJson(): TasksJson {
  return {
    version: '2.0.0',
    tasks: [
      {
        label: 'generateDebugSymbols',
        command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
        args: ['${input:getDebugSymbolDll}'],
        type: 'process',
        problemMatcher: '$msCompile',
      },
      {
        label: 'clean',
        command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
        args: ['clean', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'],
        type: 'process',
        problemMatcher: '$msCompile',
      },
      {
        label: 'build',
        command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
        args: ['build', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'],
        type: 'process',
        dependsOn: 'clean',
        group: {
          kind: 'build',
          isDefault: true,
        },
        problemMatcher: '$msCompile',
      },
      {
        label: 'clean release',
        command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
        args: ['clean', '--configuration', 'Release', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'],
        type: 'process',
        problemMatcher: '$msCompile',
      },
      {
        label: 'publish',
        command: '${config:azureLogicAppsStandard.dotnetBinaryPath}',
        args: ['publish', '--configuration', 'Release', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary'],
        type: 'process',
        dependsOn: 'clean release',
        problemMatcher: '$msCompile',
      },
      {
        label: 'func: host start',
        type: 'shell',
        dependsOn: 'build',
        options: {
          cwd: '${workspaceFolder}/bin/Debug/net8.0',
          env: {
            PATH: '${env:PATH}',
          },
        },
        windows: {
          options: {
            cwd: 'bin/Debug/net8.0',
            env: {
              PATH: '${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\NodeJs;${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}\\DotNetSDK;${env:PATH}',
            },
          },
        },
        linux: {
          options: {
            cwd: 'bin/Debug/net8.0',
            env: {
              PATH: '${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}/NodeJs:${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}/DotNetSDK:${env:PATH}',
            },
          },
        },
        osx: {
          options: {
            cwd: 'bin/Debug/net8.0',
            env: {
              PATH: '${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}/NodeJs:${config:azureLogicAppsStandard.autoRuntimeDependenciesPath}/DotNetSDK:${env:PATH}',
            },
          },
        },
        command: '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}',
        args: ['host', 'start'],
        isBackground: true,
        problemMatcher: '$func-watch',
      },
    ],
    inputs: [
      {
        id: 'getDebugSymbolDll',
        type: 'command',
        command: 'azureLogicAppsStandard.getDebugSymbolDll',
      },
    ],
  };
}

function getExpectedConvertedNugetLaunchJson(entry: WorkspaceManifestEntry): LaunchJson {
  return {
    version: '0.2.0',
    configurations: [
      {
        name: `Run/Debug logic app ${entry.appName}`,
        type: 'coreclr',
        request: 'attach',
        processId: '${command:azureLogicAppsStandard.pickFuncProcess}',
      },
    ],
  };
}

function getExpectedConvertedNugetSettingsJson(): SettingsJson {
  return {
    'azureLogicAppsStandard.deploySubpath': 'bin/Release/net8.0/publish',
    'azureLogicAppsStandard.projectLanguage': 'C#',
    'azureLogicAppsStandard.projectRuntime': '~4',
    'debug.internalConsoleOptions': 'neverOpen',
    'azureFunctions.suppressProject': true,
    'azureLogicAppsStandard.preDeployTask': 'publish',
  };
}

function getExpectedConvertedNugetExtensionsJson(): { recommendations: string[] } {
  return {
    recommendations: [
      'ms-azuretools.vscode-azurelogicapps',
      'ms-dotnettools.csharp',
      'ms-azuretools.vscode-azurefunctions',
      'ms-dotnettools.csdevkit',
    ],
  };
}

function assertNugetDebugFiles(entry: WorkspaceManifestEntry): void {
  const csprojPath = path.join(entry.appDir, `${entry.appName}.csproj`);
  const tasksPath = path.join(entry.appDir, '.vscode', 'tasks.json');
  const launchPath = path.join(entry.appDir, '.vscode', 'launch.json');
  const settingsPath = path.join(entry.appDir, '.vscode', 'settings.json');
  const extensionsPath = path.join(entry.appDir, '.vscode', 'extensions.json');

  assert.ok(fs.existsSync(csprojPath), `NuGet conversion should create ${csprojPath}`);
  assert.ok(fs.existsSync(tasksPath), 'NuGet conversion should regenerate .vscode/tasks.json');
  assert.ok(fs.existsSync(launchPath), 'NuGet conversion should regenerate .vscode/launch.json');
  assert.ok(fs.existsSync(settingsPath), 'NuGet conversion should regenerate .vscode/settings.json');
  assert.ok(fs.existsSync(extensionsPath), 'NuGet conversion should regenerate .vscode/extensions.json');
  assert.ok(fs.existsSync(path.join(entry.appDir, 'host.json')), 'NuGet conversion should restore host.json');
  assert.ok(fs.existsSync(path.join(entry.appDir, 'local.settings.json')), 'NuGet conversion should restore local.settings.json');
  assert.ok(!fs.existsSync(path.join(entry.appDir, 'host.json-copy')), 'NuGet conversion should not leave host.json-copy behind');
  assert.ok(
    !fs.existsSync(path.join(entry.appDir, 'local.settings.json-copy')),
    'NuGet conversion should not leave local.settings.json-copy behind'
  );

  const csprojContent = fs.readFileSync(csprojPath, 'utf8');
  assert.match(
    csprojContent,
    /<TargetFramework>net(6\.0|8\.0|10\.0)<\/TargetFramework>/,
    'NuGet .csproj should target a supported .NET framework'
  );
  assert.ok(csprojContent.includes('<AzureFunctionsVersion>v4</AzureFunctionsVersion>'), 'NuGet .csproj should target Azure Functions v4');
  assert.ok(csprojContent.includes('Include="Microsoft.NET.Sdk.Functions"'), 'NuGet .csproj should reference Microsoft.NET.Sdk.Functions');
  assert.ok(
    csprojContent.includes('Include="Microsoft.Azure.Workflows.WebJobs.Extension"'),
    'NuGet .csproj should reference Microsoft.Azure.Workflows.WebJobs.Extension'
  );
  assert.match(
    csprojContent,
    new RegExp(
      `Update="${entry.wfName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[/\\\\]\\*\\*[/\\\\]\\*\\.\\*"[\\s\\S]*<CopyToOutputDirectory>PreserveNewest<\\/CopyToOutputDirectory>`
    ),
    'NuGet .csproj should copy the workflow folder to output'
  );

  const tasksJson = readJsonFile<TasksJson>(tasksPath);
  assert.deepStrictEqual(
    tasksJson,
    getExpectedConvertedNugetTasksJson(),
    'NuGet tasks.json should exactly match converted legacy projects'
  );

  const launchJson = readJsonFile<LaunchJson>(launchPath);
  assert.deepStrictEqual(
    launchJson,
    getExpectedConvertedNugetLaunchJson(entry),
    'NuGet launch.json should exactly match converted legacy projects'
  );

  const settingsJson = readJsonFile<SettingsJson>(settingsPath);
  assert.deepStrictEqual(
    settingsJson,
    getExpectedConvertedNugetSettingsJson(),
    'NuGet settings.json should exactly match converted legacy projects'
  );

  const extensionsJson = readJsonFile<{ recommendations: string[] }>(extensionsPath);
  assert.deepStrictEqual(
    extensionsJson,
    getExpectedConvertedNugetExtensionsJson(),
    'NuGet extensions.json should exactly match converted legacy projects'
  );
}

async function startDebuggingWithoutHarnessCleanup(driver: WebDriver): Promise<void> {
  console.log('[nugetDebugConversion] Starting debug without harness port cleanup...');
  await runCommandFromPalette(driver, 'Debug: Start Debugging');
}

async function stopDebuggingForNugetLifecycle(driver: WebDriver, phase: string): Promise<void> {
  console.log(`[nugetDebugConversion] Stopping debug after ${phase} phase...`);
  try {
    await stopDebugging(driver);
  } catch (error: any) {
    const firstLine = error?.message?.split('\n')[0] ?? error?.message ?? 'unknown';
    console.log(`[nugetDebugConversion] Ignoring debug stop UI error after ${phase}: ${firstLine}`);
  }
  await driver
    .switchTo()
    .defaultContent()
    .catch(() => undefined);
  await clearBlockingUI(driver).catch((error: any) => {
    const firstLine = error?.message?.split('\n')[0] ?? error?.message ?? 'unknown';
    console.log(`[nugetDebugConversion] Ignoring post-stop blocking UI cleanup error after ${phase}: ${firstLine}`);
  });
}

async function assertNoFuncHostFailurePopup(driver: WebDriver): Promise<void> {
  const text = await driver
    .executeScript<string>(
      `
      return Array.from(document.querySelectorAll('[role="dialog"], .monaco-dialog-box, .notification-toast, .notifications-toasts .notification-list-item'))
        .map((el) => el.textContent || '')
        .join('\\n---\\n');
    `
    )
    .catch(() => '');

  for (const pattern of STALE_FUNC_HOST_FAILURE_PATTERNS) {
    assert.ok(!pattern.test(text), `unexpected stale-host failure popup: ${text}`);
  }
}

async function assertNoPostConversionVSCodeRegenerationPrompt(driver: WebDriver): Promise<void> {
  const text = await driver
    .executeScript<string>(
      `
      return Array.from(document.querySelectorAll('[role="dialog"], .monaco-dialog-box, .notification-toast, .notifications-toasts .notification-list-item'))
        .map((el) => el.textContent || '')
        .join('\\n---\\n');
    `
    )
    .catch(() => '');

  for (const pattern of POST_CONVERSION_PROMPT_FAILURE_PATTERNS) {
    assert.ok(!pattern.test(text), `unexpected post-conversion .vscode consistency prompt: ${text}`);
  }
}

async function runAndVerifyWorkflow(
  phase: string,
  workbench: Workbench,
  driver: WebDriver,
  entry: WorkspaceManifestEntry,
  forbiddenPopupPatterns?: RegExp[]
): Promise<void> {
  assertRunnableWorkflow(entry, phase);

  assert.ok(
    await waitForRuntimeReady(driver, {
      requireHostRunning: true,
      timeoutMs: RUNTIME_READY_TIMEOUT,
      workspacePaths: [entry.appDir],
      forbiddenPopupPatterns,
    }),
    `${phase}: Functions host should be running`
  );

  const overview = await waitForOverviewView(workbench, driver, path.join(entry.wfDir, 'workflow.json'), { timeoutMs: 120_000 });
  try {
    await assertRunTriggerable(driver, { workflowName: entry.wfName });
    await clickRefresh(driver);

    let { found: succeeded, lastStatus } = await waitForRunStatusInList(driver, 'Succeeded', 180_000);
    if (!succeeded) {
      console.log(
        `[nugetDebugConversion] ${phase}: overview Run trigger did not create a visible succeeded run (last status: "${lastStatus}"); invoking callback URL directly`
      );
      assert.ok(
        await invokeWorkflowCallback(driver, { workflowName: entry.wfName, body: { source: 'nuget-debug-conversion-e2e' } }),
        `${phase}: callback URL invocation should succeed`
      );
      ({ found: succeeded, lastStatus } = await waitForRunStatusInList(driver, 'Succeeded', 60_000));
    }

    if (!succeeded) {
      const { allSucceeded, details } = await verifyAllNodesSucceeded(driver, entry.wfName, 2000);
      assert.ok(allSucceeded, `${phase}: callback invocation should produce a succeeded run (${details})`);
      return;
    }

    if (!(await clickLatestRunRow(driver))) {
      const { allSucceeded, details } = await verifyAllNodesSucceeded(driver, entry.wfName, 2000);
      assert.ok(
        allSucceeded,
        `${phase}: succeeded run should be verifiable through action API when row navigation is unavailable (${details})`
      );
      return;
    }

    const { allSucceeded, details } = await verifyAllNodesSucceeded(driver, entry.wfName, 2000);
    assert.ok(allSucceeded, `${phase}: all action nodes should be succeeded (${details})`);
  } finally {
    await overview.switchBack().catch(() => undefined);
    await driver
      .switchTo()
      .defaultContent()
      .catch(() => undefined);
    await new EditorView().closeAllEditors().catch(() => undefined);
    await sleep(1000);
  }
}

describe('NuGet conversion debug lifecycle', function () {
  this.timeout(TEST_TIMEOUT);

  it('debugs again after bundle-to-NuGet conversion without manual func cleanup', async () => {
    const entry = cloneWorkspaceFixture(getStandardStatefulEntry());
    const workbench = new Workbench();
    const driver = workbench.getDriver();

    await openWorkspaceFileInSession(workbench, entry.wsFilePath);
    if (process.env.LA_E2E_SKIP_VALIDATION_WAIT !== '1') {
      await waitForDependencyValidation(driver);
    }
    seedBundleProjectFilesIfNeeded(entry);
    seedRunnableWorkflow(entry);

    await startDebugging(workbench, driver);
    await runAndVerifyWorkflow('bundle', workbench, driver, entry);
    await stopDebuggingForNugetLifecycle(driver, 'bundle');

    await runCommandFromPalette(driver, CONVERT_COMMAND_TITLE);
    await waitForDialogText(driver, /NuGet-based project/, COMMAND_TIMEOUT);
    await pushDialogButtonWithRetry(driver, MOVE_BUTTON_LABEL, 3);
    await confirmVSCodeRegenerationPrompt(driver);

    const csprojPath = path.join(entry.appDir, `${entry.appName}.csproj`);
    await waitForFilePredicate(csprojPath, () => fs.existsSync(csprojPath), CONVERSION_TIMEOUT, 'NuGet project file');
    await waitForExactNugetDebugFiles(entry, driver);
    assertRunnableWorkflow(entry, 'nuget');
    await assertNoPostConversionVSCodeRegenerationPrompt(driver);

    await startDebuggingWithoutHarnessCleanup(driver);
    await assertNoFuncHostFailurePopup(driver);
    await runAndVerifyWorkflow('nuget', workbench, driver, entry, [
      ...STALE_FUNC_HOST_FAILURE_PATTERNS,
      ...POST_CONVERSION_PROMPT_FAILURE_PATTERNS,
    ]);
    await assertNoFuncHostFailurePopup(driver);
    await assertNoPostConversionVSCodeRegenerationPrompt(driver);
    await stopDebuggingForNugetLifecycle(driver, 'nuget');
  });
});
