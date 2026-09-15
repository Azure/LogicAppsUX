// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { By, EditorView, Key, type WebDriver, Workbench, VSBrowser } from 'vscode-extension-tester';
import { lspDirectory } from '../../constants';
import { clearBlockingUI, sleep } from './helpers';
import { waitForExtensionReady } from './createWorkspaceShared';
import {
  clickProjectOverviewButton,
  getWorkflowRuns,
  getProjectOverviewWorkflowNames,
  invokeWorkflowCallback,
  openProjectOverviewFromRoot,
  revealEditorTab,
  startWorkflowCallback,
  stopDebugging,
  switchToActiveWebviewFrame,
  waitForExactHealthyRuntimeWorkflows,
  waitForNewWorkflowRun,
  waitForRuntimeReady,
  waitForRuntimeStopped,
  waitForWorkflowRunStatus,
  type PendingWorkflowCallback,
} from './runHelpers';
import { loadWorkspaceManifest, type WorkspaceManifestEntry } from './workspaceManifest';

const TEST_TIMEOUT = 900_000;
const SCHEMA = 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#';
const CODELESS_RUN_SUFFIX = `${Date.now()}-${process.pid}`;
const REQUEST_WORKFLOW = `overview-http-request-${CODELESS_RUN_SUFFIX}`;
const LONG_RUNNING_WORKFLOW = `overview-cancel-request-${CODELESS_RUN_SUFFIX}`;
const STATELESS_WORKFLOW = 'overview-stateless-no-history';
const NO_CALLBACK_WORKFLOW = 'overview-timer-no-callback';
const EXPECTED_WORKFLOWS = [REQUEST_WORKFLOW, LONG_RUNNING_WORKFLOW, STATELESS_WORKFLOW, NO_CALLBACK_WORKFLOW];
const PROJECT_OVERVIEW_KIND = (process.env.LA_E2E_PROJECT_OVERVIEW_KIND ?? 'codeless').toLowerCase();
if (PROJECT_OVERVIEW_KIND !== 'codeless' && PROJECT_OVERVIEW_KIND !== 'codeful') {
  throw new Error(`LA_E2E_PROJECT_OVERVIEW_KIND must be "codeless" or "codeful", received "${PROJECT_OVERVIEW_KIND}"`);
}
type ProjectOverviewKind = 'codeless' | 'codeful';
const projectOverviewKind = PROJECT_OVERVIEW_KIND as ProjectOverviewKind;
const projectDir = path.resolve(__dirname, '..', '..');

function getProjectOverviewEntry(): WorkspaceManifestEntry {
  const appType = projectOverviewKind === 'codeful' ? 'codeful' : 'standard';
  const entry = loadWorkspaceManifest().find((candidate) => candidate.appType === appType && candidate.wfType === 'Stateful');
  assert.ok(entry, `${projectOverviewKind} + Stateful workspace fixture must exist in the Phase 4.1 manifest`);
  return entry;
}

function resetProjectOverviewAzuriteStorage(entry: WorkspaceManifestEntry): void {
  const azuriteDirectory = path.join(entry.appDir, '.e2e-project-overview-azurite');
  fs.rmSync(azuriteDirectory, { recursive: true, force: true });

  const workspace = JSON.parse(fs.readFileSync(entry.wsFilePath, 'utf8').replace(/^\uFEFF/, ''));
  workspace.settings = {
    ...(workspace.settings ?? {}),
    'azureLogicAppsStandard.azuriteLocationSetting': azuriteDirectory,
  };
  fs.writeFileSync(entry.wsFilePath, `${JSON.stringify(workspace, undefined, 2)}\n`);
}

function writeWorkflow(appDir: string, name: string, workflow: unknown): string {
  const workflowDir = path.join(appDir, name);
  fs.rmSync(workflowDir, { recursive: true, force: true });
  fs.mkdirSync(workflowDir, { recursive: true });
  const workflowPath = path.join(workflowDir, 'workflow.json');
  fs.writeFileSync(workflowPath, `${JSON.stringify(workflow, undefined, 2)}\n`);
  return workflowPath;
}

function seedUnifiedOverviewWorkflows(entry: WorkspaceManifestEntry): void {
  for (const directory of fs.readdirSync(entry.appDir, { withFileTypes: true })) {
    if (directory.isDirectory() && fs.existsSync(path.join(entry.appDir, directory.name, 'workflow.json'))) {
      fs.rmSync(path.join(entry.appDir, directory.name), { recursive: true, force: true });
    }
  }

  writeWorkflow(entry.appDir, REQUEST_WORKFLOW, {
    definition: {
      $schema: SCHEMA,
      actions: {
        Response: {
          type: 'Response',
          kind: 'Http',
          inputs: { statusCode: 200, body: { source: 'project-overview-e2e' } },
          runAfter: {},
        },
      },
      contentVersion: '1.0.0.0',
      outputs: {},
      triggers: {
        manual: {
          type: 'Request',
          kind: 'Http',
          inputs: { schema: { type: 'object' } },
        },
      },
    },
    kind: 'Stateful',
  });

  writeWorkflow(entry.appDir, LONG_RUNNING_WORKFLOW, {
    definition: {
      $schema: SCHEMA,
      actions: {
        Wait: {
          type: 'Wait',
          inputs: { interval: { count: 5, unit: 'Minute' } },
          runAfter: {},
        },
        Response: {
          type: 'Response',
          kind: 'Http',
          inputs: { statusCode: 200, body: { source: 'project-overview-cancel-e2e' } },
          runAfter: { Wait: ['Succeeded'] },
        },
      },
      contentVersion: '1.0.0.0',
      outputs: {},
      triggers: {
        manual: {
          type: 'Request',
          kind: 'Http',
          inputs: { schema: { type: 'object' } },
        },
      },
    },
    kind: 'Stateful',
  });

  writeWorkflow(entry.appDir, STATELESS_WORKFLOW, {
    definition: {
      $schema: SCHEMA,
      actions: {
        Compose: {
          type: 'Compose',
          inputs: 'stateless',
          runAfter: {},
        },
      },
      contentVersion: '1.0.0.0',
      outputs: {},
      triggers: {
        manual: {
          type: 'Request',
          kind: 'Http',
          inputs: { schema: { type: 'object' } },
        },
      },
    },
    kind: 'Stateless',
  });

  writeWorkflow(entry.appDir, NO_CALLBACK_WORKFLOW, {
    definition: {
      $schema: SCHEMA,
      actions: {
        Compose: {
          type: 'Compose',
          inputs: 'scheduled',
          runAfter: {},
        },
      },
      contentVersion: '1.0.0.0',
      outputs: {},
      triggers: {
        recurrence: {
          type: 'Recurrence',
          recurrence: { frequency: 'Day', interval: 1 },
        },
      },
    },
    kind: 'Stateful',
  });

  const localSettingsPath = path.join(entry.appDir, 'local.settings.json');
  const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8').replace(/^\uFEFF/, ''));
  localSettings.Values = {
    ...(localSettings.Values ?? {}),
    ProjectDirectoryPath: entry.appDir,
    WORKFLOWS_SUBSCRIPTION_ID: '',
  };
  delete localSettings.Values[`Workflows.${STATELESS_WORKFLOW}.OperationOptions`];
  fs.writeFileSync(localSettingsPath, `${JSON.stringify(localSettings, undefined, 2)}\n`);
}

function seedCodefulOverviewWorkflow(entry: WorkspaceManifestEntry): void {
  const workflowFile = path.join(entry.appDir, `${entry.wfName}.cs`);
  const programFile = path.join(entry.appDir, 'Program.cs');
  const nugetConfigFile = path.join(entry.appDir, 'nuget.config');
  for (const requiredPath of [workflowFile, programFile]) {
    assert.ok(fs.existsSync(requiredPath), `Generated codeful fixture file must exist: ${requiredPath}`);
  }

  const originalWorkflow = fs.readFileSync(workflowFile, 'utf8');
  const namespaceName = originalWorkflow.match(/namespace\s+([A-Za-z_][A-Za-z0-9_.]*)/)?.[1];
  const className = originalWorkflow.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
  assert.ok(namespaceName && className, `Generated codeful workflow must expose a namespace and public class: ${workflowFile}`);

  fs.writeFileSync(
    workflowFile,
    `// Connector-independent Phase 4.15 codeful project-overview fixture.
namespace ${namespaceName}
{
    using Microsoft.Azure.Workflows.Sdk;

    public class ${className} : IWorkflowProvider
    {
        public FlowDefinition[] GetWorkflows()
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var response = WorkflowActions.BuiltIn.Response(responseBody: () => "project-overview-codeful");
            var workflow = trigger.Then(response);

            return new[] { WorkflowFactory.CreateStatefulWorkflow("${entry.wfName}", workflow) };
        }
    }
}
`,
    'utf8'
  );

  const originalProgram = fs.readFileSync(programFile, 'utf8');
  const programWithProviderRegistration = originalProgram.includes('services.AddWorkflowProviders(typeof(Program).Assembly);')
    ? originalProgram
    : originalProgram.replace(
        'WorkflowFactory.ConfigureServices(services);',
        'WorkflowFactory.ConfigureServices(services);\n                    services.AddWorkflowProviders(typeof(Program).Assembly);'
      );
  assert.ok(
    programWithProviderRegistration.includes('services.AddWorkflowProviders(typeof(Program).Assembly);'),
    `Generated codeful Program.cs must register workflow providers: ${programFile}`
  );
  fs.writeFileSync(programFile, programWithProviderRegistration, 'utf8');

  const sdkPackageSource = path.join(projectDir, 'src', 'assets', 'LSPServer', 'Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg');
  const dependencyRoot = process.env.LA_E2E_RUNTIME_DEPS_ROOT;
  assert.ok(dependencyRoot, 'LA_E2E_RUNTIME_DEPS_ROOT must identify the extension-managed dependency root');
  assert.ok(fs.existsSync(sdkPackageSource), `Codeful SDK package asset must exist: ${sdkPackageSource}`);
  const sdkDirectory = path.join(dependencyRoot, lspDirectory);
  fs.mkdirSync(sdkDirectory, { recursive: true });
  fs.copyFileSync(sdkPackageSource, path.join(sdkDirectory, path.basename(sdkPackageSource)));

  if (fs.existsSync(nugetConfigFile)) {
    const originalNugetConfig = fs.readFileSync(nugetConfigFile, 'utf8');
    const patchedNugetConfig = originalNugetConfig.replace(
      /(<add\s+key=["']current["']\s+value=)(["']).*?\2(\s*\/>)/,
      `$1"${sdkDirectory}"$3`
    );
    assert.ok(
      patchedNugetConfig !== originalNugetConfig || originalNugetConfig.includes(sdkDirectory),
      `Generated codeful nuget.config must contain a replaceable current package source: ${nugetConfigFile}`
    );
    fs.writeFileSync(nugetConfigFile, patchedNugetConfig, 'utf8');
  }

  for (const connectorArtifact of ['connections.json', 'parameters.json']) {
    fs.rmSync(path.join(entry.appDir, connectorArtifact), { force: true });
  }

  const localSettingsPath = path.join(entry.appDir, 'local.settings.json');
  const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8').replace(/^\uFEFF/, ''));
  localSettings.Values = {
    ...(localSettings.Values ?? {}),
    ProjectDirectoryPath: entry.appDir,
    WORKFLOWS_SUBSCRIPTION_ID: '',
  };
  fs.writeFileSync(localSettingsPath, `${JSON.stringify(localSettings, undefined, 2)}\n`);
}

async function getRowText(driver: WebDriver, workflowName: string): Promise<string> {
  return await driver.executeScript<string>(
    `
    const workflowName = arguments[0];
    const row = Array.from(document.querySelectorAll('table tbody tr'))
      .find((candidate) => (candidate.querySelector('th[scope="row"]')?.textContent || '').trim() === workflowName);
    return row?.textContent || '';
  `,
    workflowName
  );
}

async function waitForRowText(driver: WebDriver, workflowName: string, expected: string, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastText = '';
  while (Date.now() < deadline) {
    lastText = await getRowText(driver, workflowName);
    if (lastText.includes(expected)) {
      return;
    }
    await sleep(500);
  }
  assert.fail(`Workflow row "${workflowName}" did not show "${expected}" within ${timeoutMs}ms. Last row: ${lastText}`);
}

async function waitForWorkflowNames(driver: WebDriver, expected: string[], timeoutMs = 30_000): Promise<void> {
  const normalizedExpected = [...expected].sort();
  const deadline = Date.now() + timeoutMs;
  let lastNames: string[] = [];
  let lastBody = '';
  while (Date.now() < deadline) {
    lastNames = await getProjectOverviewWorkflowNames(driver);
    if (JSON.stringify([...lastNames].sort()) === JSON.stringify(normalizedExpected)) {
      return;
    }
    lastBody = await driver.executeScript<string>('return (document.body?.textContent || "").slice(0, 2000);').catch(() => '');
    await sleep(250);
  }
  assert.deepStrictEqual(
    [...lastNames].sort(),
    normalizedExpected,
    `Workflow names did not reach the expected state. Raw names=${JSON.stringify(lastNames)} body=${lastBody}`
  );
}

async function assertSortToggle(driver: WebDriver, column: string): Promise<void> {
  const header = await driver.findElement(By.xpath(`//th[@scope='col'][.//button[normalize-space()="${column}"]]`));
  const button = await header.findElement(By.css('button'));
  if ((await header.getAttribute('aria-sort')) !== 'ascending') {
    await driver.actions().move({ origin: button }).click().perform();
  }
  assert.strictEqual(await header.getAttribute('aria-sort'), 'ascending', `${column} should sort ascending`);
  const ascendingNames = await getProjectOverviewWorkflowNames(driver);
  assert.deepStrictEqual([...new Set(ascendingNames)], ascendingNames, `${column} ascending sort must not duplicate workflows`);

  await driver.actions().move({ origin: button }).click().perform();
  assert.strictEqual(await header.getAttribute('aria-sort'), 'descending', `${column} should sort descending`);
  const descendingNames = await getProjectOverviewWorkflowNames(driver);
  assert.deepStrictEqual([...new Set(descendingNames)], descendingNames, `${column} descending sort must not duplicate workflows`);
}

async function assertCompactProjectHeader(
  driver: WebDriver,
  runtimeActionLabel: 'Start runtime' | 'Stop runtime',
  timeoutMs = 120_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let runtimeLabels: string[] = [];
  while (Date.now() < deadline) {
    runtimeLabels = await driver.executeScript<string[]>(`
      return Array.from(
        document.querySelectorAll(
          'button[aria-label="Start runtime"], button[aria-label="Stop runtime"], button[aria-label="Runtime starting"]'
        )
      ).map((button) => button.getAttribute('aria-label') || '');
    `);
    if (runtimeLabels.length === 1 && runtimeLabels[0] === runtimeActionLabel) {
      break;
    }
    await sleep(500);
  }

  assert.deepStrictEqual(runtimeLabels, [runtimeActionLabel], `Runtime toggle did not settle to ${runtimeActionLabel}`);
  const headerState = await driver.executeScript<{
    metadataMatches: string[];
    refreshCount: number;
    refreshHasIcon: boolean;
    refreshText: string;
    runtimeToggleCount: number;
  }>(
    `
    const bodyText = document.body?.textContent || '';
    const metadataPatterns = [
      /\\b\\d+ workflows\\b/i,
      /Auto-refresh/i,
      /Refreshed/i,
      /Runtime:\\s*(Running|Stopped|Starting|Unavailable)/i,
    ];
    const refreshButtons = Array.from(document.querySelectorAll('button[aria-label="Refresh"]'));
    const runtimeButtons = Array.from(
      document.querySelectorAll(
        'button[aria-label="Start runtime"], button[aria-label="Stop runtime"], button[aria-label="Runtime starting"]'
      )
    );
    return {
      metadataMatches: metadataPatterns.filter((pattern) => pattern.test(bodyText)).map((pattern) => pattern.source),
      refreshCount: refreshButtons.length,
      refreshHasIcon: refreshButtons.length === 1 && !!refreshButtons[0].querySelector('svg'),
      refreshText: refreshButtons.length === 1 ? (refreshButtons[0].textContent || '').trim() : '',
      runtimeToggleCount: runtimeButtons.length,
    };
  `
  );

  assert.deepStrictEqual(headerState.metadataMatches, [], 'Compact project header must not render verbose metadata text');
  assert.strictEqual(headerState.refreshCount, 1, 'Compact project header should expose exactly one Refresh action');
  assert.strictEqual(headerState.refreshText, '', 'Refresh should be icon-only');
  assert.ok(headerState.refreshHasIcon, 'Refresh should render an icon');
  assert.strictEqual(headerState.runtimeToggleCount, 1, 'Compact project header should expose exactly one runtime toggle');
}

async function getWorkflowRowActionState(
  driver: WebDriver,
  workflowName: string
): Promise<{ cancelCount: number; cancelDisabled: boolean; openLatestCount: number; openWorkflowCount: number }> {
  return await driver.executeScript(
    `
    const workflowName = arguments[0];
    const row = Array.from(document.querySelectorAll('table tbody tr'))
      .find((candidate) => (candidate.querySelector('th[scope="row"]')?.textContent || '').trim() === workflowName);
    const cancel = row?.querySelector('button[aria-label="Cancel run for ' + workflowName + '"]');
    return {
      cancelCount: cancel ? 1 : 0,
      cancelDisabled: !!cancel?.disabled || cancel?.getAttribute('aria-disabled') === 'true',
      openLatestCount: row?.querySelectorAll('button[aria-label="Open latest run for ' + workflowName + '"]').length || 0,
      openWorkflowCount: row?.querySelectorAll('button[aria-label="Open overview for ' + workflowName + '"]').length || 0,
    };
  `,
    workflowName
  );
}

async function waitForProjectCancellationSettled(driver: WebDriver, workflowName: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastText = '';
  let lastActions = await getWorkflowRowActionState(driver, workflowName);
  while (Date.now() < deadline) {
    lastText = await getRowText(driver, workflowName);
    lastActions = await getWorkflowRowActionState(driver, workflowName);
    if (lastText.includes('Cancelled') && lastActions.cancelCount === 0) {
      return;
    }
    await sleep(500);
  }
  assert.fail(
    `Project Overview did not refresh "${workflowName}" to Cancelled without a Cancel action. Last row=${lastText}, actions=${JSON.stringify(lastActions)}`
  );
}

async function getWorkflowOverviewRunState(
  driver: WebDriver,
  identifier: string
): Promise<{
  cancelCount: number;
  cancelDisabled: boolean;
  identifierLinkCount: number;
  menuCount: number;
  openCount: number;
  rowText: string;
}> {
  return await driver.executeScript(
    `
    const identifier = arguments[0];
    const rows = Array.from(document.querySelectorAll('[role="row"], .ms-DetailsRow'));
    const row = rows.find((candidate) =>
      Array.from(candidate.querySelectorAll('a, button')).some((element) => (element.textContent || '').trim() === identifier)
    );
    const cancel = row?.querySelector('button[aria-label="Cancel run ' + identifier + '"]');
    return {
      cancelCount: cancel ? 1 : 0,
      cancelDisabled: !!cancel?.disabled || cancel?.getAttribute('aria-disabled') === 'true',
      identifierLinkCount: row
        ? Array.from(row.querySelectorAll('a, button')).filter((element) => (element.textContent || '').trim() === identifier).length
        : 0,
      menuCount: row?.querySelectorAll('button[aria-label="Show run menu"], button[title="Show run menu"]').length || 0,
      openCount: row?.querySelectorAll('button[aria-label="Open run ' + identifier + '"]').length || 0,
      rowText: row?.textContent || '',
    };
  `,
    identifier
  );
}

async function waitForWorkflowOverviewRun(
  driver: WebDriver,
  identifier: string,
  expectedStatus: string,
  expectCancel: boolean,
  timeoutMs = 120_000
): Promise<Awaited<ReturnType<typeof getWorkflowOverviewRunState>>> {
  const deadline = Date.now() + timeoutMs;
  let lastState = await getWorkflowOverviewRunState(driver, identifier);
  while (Date.now() < deadline) {
    lastState = await getWorkflowOverviewRunState(driver, identifier);
    if (
      lastState.rowText.includes(expectedStatus) &&
      lastState.identifierLinkCount > 0 &&
      lastState.openCount === 1 &&
      lastState.menuCount === 0 &&
      (expectCancel ? lastState.cancelCount === 1 : lastState.cancelCount === 0)
    ) {
      return lastState;
    }
    await sleep(500);
  }
  assert.fail(
    `Workflow Overview run "${identifier}" did not reach status=${expectedStatus}, expectCancel=${expectCancel}. Last state=${JSON.stringify(lastState)}`
  );
}

describe('Unified project overview', function () {
  this.timeout(TEST_TIMEOUT);

  let driver: WebDriver;
  let workbench: Workbench;
  let entry: WorkspaceManifestEntry;
  let expectedWorkflows: string[];
  let requestWorkflow: string;
  const pendingCallbacks: PendingWorkflowCallback[] = [];

  before(async function () {
    this.timeout(300_000);
    entry = getProjectOverviewEntry();
    resetProjectOverviewAzuriteStorage(entry);
    if (projectOverviewKind === 'codeful') {
      seedCodefulOverviewWorkflow(entry);
      expectedWorkflows = [entry.wfName];
      requestWorkflow = entry.wfName;
      assert.ok(!fs.existsSync(path.join(entry.wfDir, 'workflow.json')), 'Codeful fixture must remain source-based without workflow.json');
    } else {
      seedUnifiedOverviewWorkflows(entry);
      expectedWorkflows = EXPECTED_WORKFLOWS;
      requestWorkflow = REQUEST_WORKFLOW;
    }
    driver = VSBrowser.instance.driver;
    workbench = new Workbench();
    await waitForExtensionReady(workbench, 180_000);
    await driver.switchTo().defaultContent();
    await new EditorView().closeAllEditors();
    await clearBlockingUI(driver);
    await workbench.executeCommand('workbench.files.action.refreshFilesExplorer').catch(() => undefined);
  });

  after(async () => {
    for (const callback of pendingCallbacks) {
      callback.abort();
      await callback.response.catch(() => undefined);
    }
    try {
      await driver.switchTo().defaultContent();
      await stopDebugging(driver);
    } catch {
      /* best-effort cleanup; the test asserts stop settlement in the main flow */
    }
  });

  it(`covers ${projectOverviewKind} startup, readiness, rows, interactions, navigation, refresh, and stop settlement`, async () => {
    const opened = await openProjectOverviewFromRoot(workbench, driver, entry.appName);
    assert.ok(opened.progressSeen, 'Project-root Project overview should show runtime startup progress');

    await switchToActiveWebviewFrame(driver, {
      markerSelectors: ['table'],
      description: `${projectOverviewKind} project overview source snapshot`,
    });
    await waitForWorkflowNames(driver, expectedWorkflows, 60_000);
    if (projectOverviewKind === 'codeful') {
      const sourceRow = await getRowText(driver, requestWorkflow);
      assert.ok(sourceRow, 'Codeful workflow source metadata should render before runtime readiness settles');
      assert.ok(
        fs.existsSync(path.join(entry.appDir, `${entry.wfName}.cs`)),
        'Codeful discovery must be backed by the generated Phase 4.1 workflow source'
      );
    }
    await driver.switchTo().defaultContent();

    assert.ok(
      await waitForRuntimeReady(driver, { requireHostRunning: true, timeoutMs: 300_000 }),
      'Project overview startup should launch a Functions host that reports Running'
    );
    assert.ok(
      await waitForExactHealthyRuntimeWorkflows(driver, expectedWorkflows, { timeoutMs: 300_000 }),
      `Matching ${projectOverviewKind} runtime should register each expected workflow exactly once and report every workflow Healthy`
    );

    await switchToActiveWebviewFrame(driver, {
      markerSelectors: ['table'],
      description: `${projectOverviewKind} unified project overview`,
    });
    await assertCompactProjectHeader(driver, 'Stop runtime');

    const names = await getProjectOverviewWorkflowNames(driver);
    assert.deepStrictEqual(
      [...names].sort(),
      [...expectedWorkflows].sort(),
      'Manual context-menu startup and debug auto-open must converge on one table containing each workflow once'
    );
    assert.strictEqual(
      new Set(names.map((name) => name.toLowerCase())).size,
      names.length,
      'Project overview must not duplicate workflows'
    );

    const requestRow = await getRowText(driver, requestWorkflow);
    assert.match(requestRow, /http:\/\/localhost:\d+\//, 'Request workflow should expose a runtime callback URL');
    assert.match(requestRow, /No runs/, 'Stateful Request workflow should explicitly show No runs before invocation');
    if (projectOverviewKind === 'codeless') {
      const statelessRow = await getRowText(driver, STATELESS_WORKFLOW);
      assert.match(
        statelessRow,
        /Run history unavailable/,
        'Stateless workflow without persistence should distinguish unavailable history'
      );
      const noCallbackRow = await getRowText(driver, NO_CALLBACK_WORKFLOW);
      assert.match(noCallbackRow, /Not available/, 'Non-Request workflow should not expose a callback URL');
      assert.match(await getRowText(driver, LONG_RUNNING_WORKFLOW), /No runs/, 'Cancellation workflow should start with no runs');
    }

    assert.strictEqual(
      (await driver.findElements(By.css(`button[aria-label="Copy callback URL for ${requestWorkflow}"]`))).length,
      1,
      'Request workflow should expose one copy action'
    );
    if (projectOverviewKind === 'codeless') {
      assert.strictEqual(
        (await driver.findElements(By.css(`button[aria-label="Copy callback URL for ${NO_CALLBACK_WORKFLOW}"]`))).length,
        0,
        'Workflow without a callback must not expose copy'
      );
    }

    const columnHeaders = await driver.findElements(By.css('table thead th[scope="col"]'));
    assert.strictEqual(columnHeaders.length, 4, 'Project overview should show three data columns and one Actions column');
    assert.deepStrictEqual(
      await Promise.all(columnHeaders.map(async (header) => (await header.getText()).trim())),
      ['Workflow', 'Runtime URL', 'Last run', 'Actions'],
      'Project overview should expose the expected sortable data columns and Actions column'
    );
    for (const column of ['Workflow', 'Runtime URL', 'Last run']) {
      await assertSortToggle(driver, column);
    }

    const filter = await driver.findElement(By.css('input[placeholder="Filter by workflow name"]'));
    await filter.clear();
    await filter.sendKeys(requestWorkflow);
    await waitForWorkflowNames(driver, [requestWorkflow]);
    await driver
      .actions()
      .move({ origin: filter })
      .click()
      .keyDown(Key.CONTROL)
      .sendKeys('a')
      .keyUp(Key.CONTROL)
      .sendKeys(Key.BACK_SPACE)
      .perform();
    await waitForWorkflowNames(driver, expectedWorkflows);

    await clickProjectOverviewButton(driver, 'Refresh');
    assert.deepStrictEqual(
      [...(await getProjectOverviewWorkflowNames(driver))].sort(),
      [...expectedWorkflows].sort(),
      'Manual refresh should preserve the authoritative source/runtime workflow snapshot'
    );

    await clickProjectOverviewButton(driver, `Open overview for ${requestWorkflow}`);
    await driver.switchTo().defaultContent();
    await switchToActiveWebviewFrame(driver, {
      markerSelectors: ['[data-testid="msla-overview-command-bar"]'],
      markerText: 'All project workflows',
      description: 'workflow overview opened from project overview',
    });
    const copyButton = await driver.findElement(By.css('button[aria-label="Copy callback URL"]'));
    await driver.actions().move({ origin: copyButton }).click().perform();
    const copied = await driver.executeScript<string>('return navigator.clipboard.readText();');
    assert.match(copied, /http:\/\/localhost:\d+\//, 'Workflow Overview copy should place the callback URL on the clipboard');

    const backlink = await driver.findElement(By.css('button[aria-label="All project workflows"]'));
    await driver.actions().move({ origin: backlink }).click().perform();
    await driver.switchTo().defaultContent();
    await switchToActiveWebviewFrame(driver, {
      markerSelectors: ['table'],
      description: 'project overview backlink target',
    });

    assert.ok(
      await invokeWorkflowCallback(driver, { workflowName: requestWorkflow, body: { source: 'automatic-refresh' } }),
      'Request workflow invocation should succeed after workflow health and callback readiness'
    );
    await waitForRowText(driver, requestWorkflow, 'Succeeded', 120_000);

    await clickProjectOverviewButton(driver, `Open latest run for ${requestWorkflow}`);
    await driver.switchTo().defaultContent();
    await switchToActiveWebviewFrame(driver, {
      markerText: 'Succeeded',
      description: 'latest run monitoring view',
      timeoutMs: 120_000,
    });
    const monitoringBody = await driver.executeScript<string>('return document.body?.textContent || "";');
    assert.match(monitoringBody, /Succeeded/, 'Latest-run navigation should open the successful monitoring view');

    if (projectOverviewKind === 'codeless') {
      await revealEditorTab(driver, `${entry.appName} - Project overview`);
      await switchToActiveWebviewFrame(driver, {
        markerSelectors: ['table'],
        description: 'project overview for run cancellation',
      });

      const firstExistingRuns = new Set((await getWorkflowRuns(LONG_RUNNING_WORKFLOW)).map((run) => run.id));
      const firstCallback = await startWorkflowCallback(driver, {
        workflowName: LONG_RUNNING_WORKFLOW,
        body: { source: 'project-overview-cancel' },
      });
      assert.ok(firstCallback, 'Long-running callback should start without waiting for its Response action');
      pendingCallbacks.push(firstCallback);
      const firstRun = await waitForNewWorkflowRun(LONG_RUNNING_WORKFLOW, firstExistingRuns);
      assert.ok(firstRun, 'Management API should expose the exact first long-running run in Running state');
      await waitForRowText(driver, LONG_RUNNING_WORKFLOW, 'Running', 120_000);
      const projectRunningActions = await getWorkflowRowActionState(driver, LONG_RUNNING_WORKFLOW);
      assert.deepStrictEqual(
        projectRunningActions,
        { cancelCount: 1, cancelDisabled: false, openLatestCount: 1, openWorkflowCount: 1 },
        'Running Project Overview row should expose icon-only Open latest, Cancel, and Open workflow actions'
      );

      const projectCancel = await driver.findElement(By.css(`button[aria-label="Cancel run for ${LONG_RUNNING_WORKFLOW}"]`));
      assert.strictEqual((await projectCancel.getText()).trim(), '', 'Project Overview Cancel action should be icon-only');
      await driver.actions().move({ origin: projectCancel }).click().perform();
      assert.ok(
        (await getWorkflowRowActionState(driver, LONG_RUNNING_WORKFLOW)).cancelDisabled,
        'Project Overview Cancel action should disable immediately after click'
      );
      assert.ok(
        await waitForWorkflowRunStatus(LONG_RUNNING_WORKFLOW, firstRun, 'Cancelled'),
        `Exact first run ${firstRun.id} should reach Cancelled`
      );
      await waitForProjectCancellationSettled(driver, LONG_RUNNING_WORKFLOW);

      const secondExistingRuns = new Set((await getWorkflowRuns(LONG_RUNNING_WORKFLOW)).map((run) => run.id));
      const secondCallback = await startWorkflowCallback(driver, {
        workflowName: LONG_RUNNING_WORKFLOW,
        body: { source: 'workflow-overview-cancel' },
      });
      assert.ok(secondCallback, 'Second long-running callback should start without waiting for its Response action');
      pendingCallbacks.push(secondCallback);
      const secondRun = await waitForNewWorkflowRun(LONG_RUNNING_WORKFLOW, secondExistingRuns);
      assert.ok(secondRun, 'Management API should expose the exact second long-running run in Running state');

      await clickProjectOverviewButton(driver, `Open overview for ${LONG_RUNNING_WORKFLOW}`);
      await driver.switchTo().defaultContent();
      await switchToActiveWebviewFrame(driver, {
        markerSelectors: ['[data-testid="msla-overview-command-bar"]'],
        markerText: secondRun.identifier,
        description: 'workflow overview for exact running cancellation run',
      });
      const workflowRunningState = await waitForWorkflowOverviewRun(driver, secondRun.identifier, 'Running', true);
      assert.strictEqual(workflowRunningState.identifierLinkCount, 1, 'Run identifier should remain a direct link/action');
      const workflowOpen = await driver.findElement(By.css(`button[aria-label="Open run ${secondRun.identifier}"]`));
      const workflowCancel = await driver.findElement(By.css(`button[aria-label="Cancel run ${secondRun.identifier}"]`));
      assert.strictEqual((await workflowOpen.getText()).trim(), '', 'Workflow Overview Open action should be icon-only');
      assert.strictEqual((await workflowCancel.getText()).trim(), '', 'Workflow Overview Cancel action should be icon-only');
      await driver.actions().move({ origin: workflowCancel }).click().perform();
      assert.ok(
        (await getWorkflowOverviewRunState(driver, secondRun.identifier)).cancelDisabled,
        'Workflow Overview Cancel action should disable immediately after click'
      );
      assert.ok(
        await waitForWorkflowRunStatus(LONG_RUNNING_WORKFLOW, secondRun, 'Cancelled'),
        `Exact second run ${secondRun.id} should reach Cancelled`
      );
      await clickProjectOverviewButton(driver, 'Refresh');
      await waitForWorkflowOverviewRun(driver, secondRun.identifier, 'Cancelled', false);
    }

    await revealEditorTab(driver, `${entry.appName} - Project overview`);
    await switchToActiveWebviewFrame(driver, {
      markerSelectors: ['table'],
      description: 'project overview before runtime stop',
    });
    await driver.switchTo().defaultContent();
    await stopDebugging(driver);
    await waitForRuntimeStopped(driver, 120_000);

    await revealEditorTab(driver, `${entry.appName} - Project overview`);
    await switchToActiveWebviewFrame(driver, {
      markerSelectors: ['button[aria-label="Start runtime"]'],
      description: 'project overview after runtime stop',
      timeoutMs: 120_000,
    });
    await assertCompactProjectHeader(driver, 'Start runtime');
    const runtimeStoppedCount = await driver.executeScript<number>(
      `return Array.from(document.querySelectorAll('[data-testid="project-overview-lifecycle-status"]'))
        .filter((element) => (element.textContent || '').trim() === 'Runtime stopped').length;`
    );
    assert.strictEqual(runtimeStoppedCount, 1, 'Runtime stopped should exist only in the lifecycle live region, not a duplicate banner');
  });
});
