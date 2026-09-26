import * as assert from 'assert';
import { execFileSync, execSync } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  type CdpConnection,
  connectToVsCodeCdp,
  connectToVsCodeCdpByText,
  connectToVsCodeWorkbenchCdp,
  waitForCreateWorkspaceFrameContext,
  waitForWebviewFrameContext,
} from './cdpClient';
import {
  assertNextButtonEnabled,
  clickPoint,
  type CdpEvaluator,
  enterFieldValue,
  getFieldState,
  getLabels,
  getPageText,
  isDropdownValueSelected,
  isRadioOptionChecked,
  pressKey,
  selectDropdownOption,
  selectRadioOption,
  waitForAsyncValidationToSettle,
  waitForFieldVisible,
} from './cdpFormHelpers';
import type { CodefulControlVariant, FieldLabels } from './createWorkspaceTypes';
import { assertNoDialogAttempts, installDialogGuard, withAllowedDialogResponses } from './dialogGuard';
import { captureCdpScreenshot } from './screenshot';
import { containsIgnoreCase, normalizeFsPath, uniqueName } from './testUtils';
import { waitForVisibleDelay } from './visibleDelay';
import { closeAllTabs, closeWebviewTabs, describeOpenTabs, getTabViewType, getWebviewTabs, waitForWebviewTab } from './webviewTabs';
import {
  applyCodefulControlVariantToProject,
  assertCodefulControlVariant,
  assertConvertedNugetProject,
  getCodefulCsprojPath,
  hasCsproj,
  patchCodefulProjectForDebugGuard,
  readJsonFile,
  requiredValue,
  waitForPathExists,
} from './workspaceArtifacts';

const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const createWorkspaceCommand = 'azureLogicAppsStandard.createWorkspace';
const openDesignerCommand = 'azureLogicAppsStandard.openDesigner';
const openOverviewCommand = 'azureLogicAppsStandard.openOverview';
const switchToDotnetProjectCommand = 'azureLogicAppsStandard.switchToDotnetProject';
const createWorkspaceViewType = 'CreateWorkspace';
const createWorkspaceTabViewType = `mainThreadWebview-${createWorkspaceViewType}`;
const createWorkspaceTitle = 'Create workspace';
const designerViewType = 'designerLocal';
const designerTabViewType = `mainThreadWebview-${designerViewType}`;
const overviewViewType = 'workflowOverview';
const overviewTabViewType = `mainThreadWebview-${overviewViewType}`;
const monitoringViewType = 'monitoring';
const managementBaseUrl = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
const apiVersion = '2019-10-01-edge-preview';
const requestTriggerTitle = 'When a HTTP request is received';
const responseActionTitle = 'Response';
const msnWeatherActionName = 'Get_current_weather';
const msnWeatherConnectionReferenceName = 'msnweather';
const msnWeatherLocation = '98058';
const azuritePorts = [10000, 10001, 10002];

type WorkspaceAppType = 'standard' | 'customCode' | 'rulesEngine' | 'codeful';

interface WorkspaceCreationCase {
  label: string;
  appType: WorkspaceAppType;
  radioLabel: string;
  wsName: string;
  appName: string;
  wfName: string;
  functionFolderName?: string;
  functionNamespace?: string;
  functionName?: string;
  codefulControlVariant?: CodefulControlVariant;
}

interface CreatedWorkspace {
  label: string;
  appType: WorkspaceAppType;
  wsName: string;
  appName: string;
  wfName: string;
  functionFolderName?: string;
  functionNamespace?: string;
  functionName?: string;
  workspaceDir: string;
  workspaceFilePath: string;
  appDir: string;
  workflowJsonPath: string;
  codefulWorkflowPath?: string;
  folderPaths: string[];
  codefulControlVariant?: CodefulControlVariant;
}

interface HttpResult {
  status: number;
  body: string;
}

interface MsnWeatherAzureSettings {
  subscriptionId: string;
  resourceGroupName: string;
  location: string;
  tenantId?: string;
  managementBaseUrl: string;
}

interface SavedWorkflowOperations {
  requestTriggerName: string;
  responseActionName: string;
}

interface TaskEvent {
  phase: 'taskStart' | 'taskEnd' | 'processStart' | 'processEnd' | 'debugStart' | 'debugTerminated';
  taskName: string;
  scopeFsPath: string | null;
  processId: number | null;
  exitCode: number | null;
  timestamp: string;
}

interface TaskRecorder {
  readonly events: TaskEvent[];
  dispose(): void;
}

interface CodefulTaskSummary {
  cleanStart: number;
  cleanReleaseStart: number;
  buildStart: number;
  publishStart: number;
  funcHostStartStart: number;
  cleanExit: number | null;
  buildExit: number | null;
  publishExit: number | null;
  cleanReleaseExit: number | null;
}

installDialogGuard();

suite('Generated Workspace Designer Lifecycle Tests', () => {
  const tempWorkspaceParentPath = fs.mkdtempSync(path.join(os.tmpdir(), 'la-e2e-cli-workspace-lifecycle-'));
  const lifecycleMode = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE ?? 'create';

  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension(logicAppsExtensionId);
    assert.ok(extension, `Expected ${logicAppsExtensionId} to be loaded from the extension development path`);
    await extension.activate();
  });

  suiteTeardown(async () => {
    await waitForVisibleDelay('Generated workspace designer lifecycle');
    await closeWebviewTabs(createWorkspaceViewType);
    await closeWebviewTabs(designerViewType);
    await stopDebuggingAndTasks();
  });

  suiteTeardown(() => {
    if (lifecycleMode === 'create' || lifecycleMode === 'codeful-create') {
      return;
    }

    try {
      fs.rmSync(tempWorkspaceParentPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`[workspace-lifecycle] Unable to remove temp workspace parent ${tempWorkspaceParentPath}: ${String(error)}`);
    }
  });

  test('Should open generated designers and run saved workflows for Standard, custom code, and rules engine projects', async function () {
    this.timeout(1_800_000);

    if (lifecycleMode === 'create') {
      const createdWorkspaces: CreatedWorkspace[] = [];
      const createLabel = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CREATE_LABEL;
      for (const creationCase of getWorkspaceCreationCases().filter((candidate) => !createLabel || candidate.label === createLabel)) {
        createdWorkspaces.push(await createWorkspaceThroughWebview(creationCase, tempWorkspaceParentPath));
      }

      const manifestPath = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST;
      assert.ok(manifestPath, 'LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST must be set in create mode');
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, `${JSON.stringify(createdWorkspaces, null, 2)}\n`);
      return;
    }

    if (lifecycleMode === 'codeful-create') {
      const createdWorkspaces: CreatedWorkspace[] = [];
      const createLabel = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CREATE_LABEL;
      for (const creationCase of getCodefulDebugCreationCases().filter((candidate) => !createLabel || candidate.label === createLabel)) {
        const createdWorkspace = await createWorkspaceThroughWebview(creationCase, tempWorkspaceParentPath);
        patchCodefulProjectForDebugGuard(createdWorkspace.appDir, createdWorkspace.wfName, creationCase.label);
        applyCodefulControlVariantToProject(createdWorkspace.appDir, creationCase.codefulControlVariant);
        assertCodefulControlVariant(createdWorkspace.appDir, creationCase.codefulControlVariant, creationCase.label);
        createdWorkspaces.push({ ...createdWorkspace, codefulControlVariant: creationCase.codefulControlVariant });
      }

      const manifestPath = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST;
      assert.ok(manifestPath, 'LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST must be set in codeful-create mode');
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, `${JSON.stringify(createdWorkspaces, null, 2)}\n`);
      return;
    }

    if (lifecycleMode === 'nuget-run') {
      await runNugetConversionLifecycle(getWorkspaceLifecycleCaseFromEnv());
      return;
    }

    if (lifecycleMode === 'msn-weather-run') {
      await runMsnWeatherLifecycle(getWorkspaceLifecycleCaseFromEnv());
      return;
    }

    if (lifecycleMode === 'codeful-run') {
      await runCodefulDebugTaskLifecycle(getWorkspaceLifecycleCaseFromEnv());
      return;
    }

    assert.strictEqual(lifecycleMode, 'run', `Unsupported workspace lifecycle mode: ${lifecycleMode}`);
    const createdWorkspace = getWorkspaceLifecycleCaseFromEnv();
    console.log(`[workspace-lifecycle] Running ${createdWorkspace.label} workspace from ${createdWorkspace.workspaceFilePath}`);
    ensureLocalSettingsForDesigner(createdWorkspace.appDir);

    console.log(`[workspace-lifecycle] Waiting for ${createdWorkspace.label} Logic App folder`);
    await waitForGeneratedLogicAppFolder(createdWorkspace);
    buildCustomCodeProjectIfNeeded(createdWorkspace);
    if (createdWorkspace.appType === 'standard') {
      console.log(`[workspace-lifecycle] Opening ${createdWorkspace.label} designer`);
      await openDesignerAndCreateWorkflow(createdWorkspace);
      await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-designer-open`);
    } else {
      console.log(`[workspace-lifecycle] ${createdWorkspace.label}: skipping designer open; using generated workflow`);
      assertGeneratedWorkflowReadyForRuntime(createdWorkspace);
      await waitForCustomCodeRuntimeArtifactsIfNeeded(createdWorkspace);
      await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-generated-workflow-ready`);
    }

    await startDebuggingGeneratedWorkspace(createdWorkspace);
    await runWorkflowThroughOverviewAndAssertSucceeded(createdWorkspace);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-run-succeeded`);

    await assertNoDialogAttempts('Generated workspace designer lifecycle');
  });
});

function getWorkspaceCreationCases(): WorkspaceCreationCase[] {
  return [
    {
      label: 'standard',
      appType: 'standard',
      radioLabel: 'Logic app (Standard)',
      wsName: uniqueName('clilifestdws'),
      appName: uniqueName('clilifestdapp'),
      wfName: uniqueName('clilifestdwf'),
    },
    {
      label: 'custom-code',
      appType: 'customCode',
      radioLabel: 'Logic app with custom code',
      wsName: uniqueName('clilifeccws'),
      appName: uniqueName('clilifeccapp'),
      wfName: uniqueName('clilifeccwf'),
      functionFolderName: uniqueName('clilifeccfolder'),
      functionNamespace: 'MyCompany.Functions',
      functionName: uniqueName('clilifeccfn'),
    },
    {
      label: 'rules-engine',
      appType: 'rulesEngine',
      radioLabel: 'Logic app with rules engine',
      wsName: uniqueName('cliliferews'),
      appName: uniqueName('clilifereapp'),
      wfName: uniqueName('cliliferewf'),
      functionFolderName: uniqueName('cliliferefolder'),
      functionNamespace: 'RulesEngineNamespace',
      functionName: uniqueName('cliliferefn'),
    },
  ];
}

function getCodefulDebugCreationCases(): WorkspaceCreationCase[] {
  return [
    {
      label: 'codeful-modern',
      appType: 'codeful',
      radioLabel: 'Logic app (codeful)',
      wsName: uniqueName('clicodemodernws'),
      appName: uniqueName('clicodemodernapp'),
      wfName: uniqueName('clicodemodernwf'),
      codefulControlVariant: 'modern-control',
    },
    {
      label: 'codeful-legacy',
      appType: 'codeful',
      radioLabel: 'Logic app (codeful)',
      wsName: uniqueName('clicodelegacyws'),
      appName: uniqueName('clicodelegacyapp'),
      wfName: uniqueName('clicodelegacywf'),
      codefulControlVariant: 'legacy-control',
    },
  ];
}

function getWorkspaceLifecycleCaseFromEnv(): CreatedWorkspace {
  const rawCase = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE;
  assert.ok(rawCase, 'LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE must be set in run mode');
  return JSON.parse(rawCase) as CreatedWorkspace;
}

async function createWorkspaceThroughWebview(creationCase: WorkspaceCreationCase, parentPath: string): Promise<CreatedWorkspace> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { cdp, contextId } = await openCreateWorkspaceContext();
    try {
      await fillWorkspaceCreationFields(cdp, contextId, creationCase, parentPath);
      await dismissWorkbenchNotifications();
      await assertWorkspaceCreationFields(cdp, contextId, creationCase, parentPath);
      await captureWorkspaceCreationFormScreenshots(cdp, contextId, creationCase.label, 'fields-verified');
      await assertNextButtonEnabled(cdp, contextId, `${creationCase.label} creation fields`);
      await clickWizardButton(cdp, contextId, 'Next');
      await waitForReviewStep(cdp, contextId, creationCase);
      await captureLifecycleScreenshot(`workspace-lifecycle-${creationCase.label}-review`);
      await clickWizardButton(cdp, contextId, 'Create workspace');
      await waitForCreatedWorkspaceMaterialization(parentPath, creationCase);
      return verifyCreatedWorkspace(parentPath, creationCase);
    } catch (error) {
      lastError = error;
      if (attempt === 2 || !String(error).includes('Timed out waiting for field')) {
        throw error;
      }
      console.warn(`[workspace-lifecycle] Retrying ${creationCase.label} Create Workspace webview after blank form context`);
    } finally {
      cdp.dispose();
      await closeWebviewTabs(createWorkspaceViewType);
    }
  }

  throw lastError;
}

async function openCreateWorkspaceContext(): Promise<{ cdp: CdpEvaluator & { dispose(): void }; contextId: number }> {
  await closeWebviewTabs(createWorkspaceViewType);
  const tabsBefore = getWebviewTabs(createWorkspaceViewType).length;

  await vscode.commands.executeCommand(createWorkspaceCommand);

  const tab = await waitForWebviewTab(createWorkspaceViewType, tabsBefore);
  assert.strictEqual(getTabViewType(tab), createWorkspaceTabViewType);
  assert.strictEqual(tab.label, createWorkspaceTitle);

  const cdp = await connectToVsCodeCdp({ targetName: 'Create Workspace webview' });
  const contextId = await waitForCreateWorkspaceFrameContext(cdp, 60000);
  await captureLifecycleScreenshot('workspace-lifecycle-create-workspace-form-ready');
  return { cdp, contextId };
}

async function fillWorkspaceCreationFields(
  cdp: CdpEvaluator,
  contextId: number,
  creationCase: WorkspaceCreationCase,
  parentPath: string
): Promise<void> {
  await enterFieldValue(cdp, contextId, 'Workspace parent folder path', parentPath);
  await waitForAsyncValidationToSettle(cdp, contextId);
  await captureLifecycleScreenshot(`workspace-lifecycle-${creationCase.label}-parent-folder-entered`);
  await enterFieldValue(cdp, contextId, 'Workspace name', creationCase.wsName);
  await waitForAsyncValidationToSettle(cdp, contextId);
  await captureLifecycleScreenshot(`workspace-lifecycle-${creationCase.label}-workspace-name-entered`);
  await enterFieldValue(cdp, contextId, 'Logic app name', creationCase.appName);
  await enterFieldValue(cdp, contextId, 'Workflow name', creationCase.wfName);
  await captureLifecycleScreenshot(`workspace-lifecycle-${creationCase.label}-required-fields-entered`);
  await selectDropdownOption(cdp, contextId, 'Workflow type', 'Stateful');
  await selectRadioOption(cdp, contextId, creationCase.radioLabel);
  await captureLifecycleScreenshot(`workspace-lifecycle-${creationCase.label}-type-selected`);

  if (creationCase.appType === 'customCode') {
    await waitForFieldVisible(cdp, contextId, ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']);
    await selectDropdownOption(cdp, contextId, '.NET Version', '.NET 8');
    await enterFieldValue(
      cdp,
      contextId,
      ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name'],
      requiredValue(creationCase.functionFolderName)
    );
    await enterFieldValue(cdp, contextId, ['Function namespace', 'Namespace', 'namespace'], requiredValue(creationCase.functionNamespace));
    await enterFieldValue(cdp, contextId, 'Function name', requiredValue(creationCase.functionName));
  } else if (creationCase.appType === 'rulesEngine') {
    await waitForFieldVisible(cdp, contextId, ['Rules engine folder name', 'rules engine folder', 'Folder name']);
    await enterFieldValue(
      cdp,
      contextId,
      ['Rules engine folder name', 'rules engine folder', 'Folder name'],
      requiredValue(creationCase.functionFolderName)
    );
    await enterFieldValue(cdp, contextId, ['Function namespace', 'Namespace', 'namespace'], requiredValue(creationCase.functionNamespace));
    await enterFieldValue(cdp, contextId, 'Function name', requiredValue(creationCase.functionName));
  }

  await waitForAsyncValidationToSettle(cdp, contextId);
}

async function assertWorkspaceCreationFields(
  cdp: CdpEvaluator,
  contextId: number,
  creationCase: WorkspaceCreationCase,
  parentPath: string
): Promise<void> {
  const expectedFields: Array<{ labels: FieldLabels; value: string }> = [
    { labels: 'Workspace parent folder path', value: parentPath },
    { labels: 'Workspace name', value: creationCase.wsName },
    { labels: 'Logic app name', value: creationCase.appName },
    { labels: 'Workflow name', value: creationCase.wfName },
  ];

  if (creationCase.appType === 'customCode') {
    expectedFields.push(
      {
        labels: ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name'],
        value: requiredValue(creationCase.functionFolderName),
      },
      { labels: ['Function namespace', 'Namespace', 'namespace'], value: requiredValue(creationCase.functionNamespace) },
      { labels: 'Function name', value: requiredValue(creationCase.functionName) }
    );
  } else if (creationCase.appType === 'rulesEngine') {
    expectedFields.push(
      {
        labels: ['Rules engine folder name', 'rules engine folder', 'Folder name'],
        value: requiredValue(creationCase.functionFolderName),
      },
      { labels: ['Function namespace', 'Namespace', 'namespace'], value: requiredValue(creationCase.functionNamespace) },
      { labels: 'Function name', value: requiredValue(creationCase.functionName) }
    );
  }

  for (const field of expectedFields) {
    const state = await getFieldState(cdp, contextId, field.labels);
    assert.strictEqual(
      state.value,
      field.value,
      `Expected ${creationCase.label} field ${getLabels(field.labels).join('/')} to equal ${field.value}. State=${JSON.stringify(state)}`
    );
  }

  if (creationCase.appType !== 'codeful') {
    assert.ok(
      await isDropdownValueSelected(cdp, contextId, 'Workflow type', 'Stateful'),
      `Expected ${creationCase.label} Workflow type dropdown to be Stateful`
    );
  }
  assert.ok(
    await isRadioOptionChecked(cdp, contextId, creationCase.radioLabel),
    `Expected ${creationCase.label} app type radio to be checked`
  );

  if (creationCase.appType === 'customCode') {
    assert.ok(await isDropdownValueSelected(cdp, contextId, '.NET Version', '.NET 8'), 'Expected custom-code .NET Version to be .NET 8');
  }
}

async function captureWorkspaceCreationFormScreenshots(cdp: CdpEvaluator, contextId: number, label: string, stage: string): Promise<void> {
  for (const position of ['top', 'middle', 'bottom']) {
    await scrollCreateWorkspaceForm(cdp, contextId, position);
    await captureLifecycleScreenshot(`workspace-lifecycle-${label}-${stage}-${position}`);
  }
}

async function scrollCreateWorkspaceForm(cdp: CdpEvaluator, contextId: number, position: string): Promise<void> {
  await cdp.evaluate(
    contextId,
    `(() => {
      const position = ${JSON.stringify(position)};
      const scrollableElements = Array.from(document.querySelectorAll('*'))
        .filter((element) => element instanceof HTMLElement && element.scrollHeight > element.clientHeight + 20);
      const scrollable = scrollableElements
        .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || document.scrollingElement;
      if (!scrollable) {
        return;
      }
      const maxScrollTop = scrollable.scrollHeight - scrollable.clientHeight;
      const top = position === 'top' ? 0 : position === 'middle' ? Math.floor(maxScrollTop / 2) : maxScrollTop;
      scrollable.scrollTo({ top, behavior: 'instant' });
    })()`
  );
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function ensureLocalSettingsForDesigner(appDir: string): void {
  const settingsPath = path.join(appDir, 'local.settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  settings.Values = settings.Values ?? {};
  settings.Values.WORKFLOWS_SUBSCRIPTION_ID = '';
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

async function waitForGeneratedLogicAppFolder(createdWorkspace: CreatedWorkspace): Promise<void> {
  await waitUntil(
    () => {
      const openFolders = vscode.workspace.workspaceFolders ?? [];
      return openFolders.some((folder) => normalizeFsPath(folder.uri.fsPath) === normalizeFsPath(createdWorkspace.appDir));
    },
    45000,
    `startup workspace folders to include ${createdWorkspace.appDir}. Current folders: ${JSON.stringify(
      (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath)
    )}`
  );
}

async function openDesignerAndCreateWorkflow(
  createdWorkspace: CreatedWorkspace,
  options: { includeMsnWeather?: boolean; useAzureConnectors?: boolean } = {}
): Promise<void> {
  await closeAllTabs();
  const workflowDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(createdWorkspace.workflowJsonPath));
  await vscode.window.showTextDocument(workflowDocument, { preview: false });
  const tabsBefore = getWebviewTabs(designerViewType).length;

  const openDesignerPromise = vscode.commands
    .executeCommand(openDesignerCommand)
    .then(undefined, (error) => console.warn(`[workspace-lifecycle] openDesigner command rejected: ${String(error)}`));
  assert.ok(openDesignerPromise, 'Expected open designer command to start');

  await handleDesignerQuickPickPrompts(15000, { useAzureConnectors: options.useAzureConnectors === true });

  const tab = await waitForWebviewTab(designerViewType, tabsBefore, 360000);
  assert.strictEqual(getTabViewType(tab), designerTabViewType);
  assert.ok(
    tab.label.includes(createdWorkspace.wfName),
    `Expected designer tab label to include workflow name "${createdWorkspace.wfName}". Open tabs: ${describeOpenTabs()}`
  );

  await handleDesignerQuickPickPrompts(15000, { useAzureConnectors: options.useAzureConnectors === true });

  const cdp = await connectToVsCodeCdp({ targetName: `${createdWorkspace.label} designer webview` });
  try {
    const contextId = await waitForWebviewFrameContext(cdp, {
      allTextIncludes: ['Save'],
      description: `${createdWorkspace.label} designer webview DOM context`,
      timeoutMs: 180000,
    });
    await waitForDesignerText(
      cdp,
      contextId,
      ['Add a trigger', requestTriggerTitle, responseActionTitle],
      180000,
      `${createdWorkspace.label} designer canvas content`
    );
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-designer-ready`);

    const initialCanvasText = await getDesignerText(cdp, contextId);
    if (initialCanvasText.includes('Add a trigger')) {
      await addRequestTriggerThroughDesigner(cdp, contextId, createdWorkspace.label);
      if (options.includeMsnWeather) {
        await addMsnWeatherActionThroughDesigner(cdp, contextId, createdWorkspace.label);
        await addResponseActionThroughDesigner(cdp, contextId, createdWorkspace.label);
        await configureResponseBodyThroughDesigner(cdp, contextId, createdWorkspace.label, msnWeatherActionName);
      } else {
        await addResponseActionThroughDesigner(cdp, contextId, createdWorkspace.label);
      }
    } else {
      console.log(`[workspace-lifecycle] ${createdWorkspace.label}: designer opened with generated workflow content`);
      if (options.includeMsnWeather) {
        const canvasTextLower = initialCanvasText.toLowerCase();
        if (!canvasTextLower.includes('weather')) {
          await addMsnWeatherActionThroughDesigner(cdp, contextId, createdWorkspace.label);
        }
      }
      if (!initialCanvasText.includes(responseActionTitle)) {
        await addResponseActionThroughDesigner(cdp, contextId, createdWorkspace.label);
      }
      if (options.includeMsnWeather) {
        await configureResponseBodyThroughDesigner(cdp, contextId, createdWorkspace.label, msnWeatherActionName);
      }
    }
    await saveWorkflowThroughDesigner(cdp, contextId, createdWorkspace.label);

    const canvasText = await getDesignerText(cdp, contextId);
    assert.ok(
      canvasText.includes(responseActionTitle),
      `${createdWorkspace.label} designer should render the Response action added through the UI. Text: ${canvasText.slice(0, 1000)}`
    );
    await waitForSavedWorkflowContainsDesignerChanges(createdWorkspace);
    if (options.includeMsnWeather) {
      assertMsnWeatherStandardWorkflow(createdWorkspace);
    }
  } catch (error) {
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-designer-failure`);
    throw error;
  } finally {
    cdp.dispose();
  }
}

async function addRequestTriggerThroughDesigner(cdp: CdpEvaluator, contextId: number, label: string): Promise<void> {
  console.log(`[workspace-lifecycle] ${label}: clicking Add a trigger`);
  await clickDesignerElement(
    cdp,
    contextId,
    ['[data-testid="card-Add a trigger"]', '[data-automation-id="card-Add_a_trigger"]', '[aria-label="Add a trigger"]'],
    'Add a trigger'
  );
  await waitForDiscoveryPanelThroughDesigner(cdp, contextId, 60000, `${label} trigger discovery panel`);
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-trigger-panel-open`);

  console.log(`[workspace-lifecycle] ${label}: searching for Request trigger`);
  await searchInDiscoveryPanelThroughDesigner(cdp, contextId, 'Request');
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-request-search-entered`);
  await waitForSearchResultsThroughDesigner(cdp, contextId, 60000, `${label} Request search results`);

  await selectOperationThroughDesigner(cdp, contextId, 'Request', [
    'when a http request is received',
    'when an http request is received',
    'http request',
  ]);
  await waitForDesignerText(cdp, contextId, [requestTriggerTitle, 'Request'], 90000, `${label} Request trigger on canvas`);
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-request-trigger-added`);
}

async function addResponseActionThroughDesigner(cdp: CdpEvaluator, contextId: number, label: string): Promise<void> {
  await openActionDiscoveryPanelThroughDesigner(cdp, contextId, label);

  console.log(`[workspace-lifecycle] ${label}: searching for Response action`);
  await searchInDiscoveryPanelThroughDesigner(cdp, contextId, responseActionTitle);
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-response-search-entered`);
  await waitForSearchResultsThroughDesigner(cdp, contextId, 60000, `${label} Response search results`);

  await selectOperationThroughDesigner(cdp, contextId, responseActionTitle, ['response']);
  await waitForDesignerText(cdp, contextId, [responseActionTitle], 90000, `${label} Response action on canvas`);
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-response-action-added`);
}

async function addMsnWeatherActionThroughDesigner(cdp: CdpEvaluator, contextId: number, label: string): Promise<void> {
  await openActionDiscoveryPanelThroughDesigner(cdp, contextId, label);

  console.log(`[workspace-lifecycle] ${label}: searching for MSN Weather current weather action`);
  await searchInDiscoveryPanelThroughDesigner(cdp, contextId, 'current weather');
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-msn-weather-search-entered`);
  await waitForSearchResultsThroughDesigner(cdp, contextId, 90000, `${label} MSN Weather search results`);

  await selectOperationThroughDesigner(cdp, contextId, 'Get current weather', ['current weather']);
  await handleMsnWeatherConnectionThroughDesigner(cdp, contextId, label);
  await waitForDesignerText(
    cdp,
    contextId,
    ['Get current weather', 'Current weather', 'Location'],
    120000,
    `${label} MSN Weather action panel`
  );
  await fillDesignerParameter(cdp, contextId, ['Location', 'location'], msnWeatherLocation, `${label} MSN Weather Location`);
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-msn-weather-action-configured`);
  await tryClickDesignerElement(cdp, contextId, ['button', '[role="button"]', '[aria-label="Close"]'], 'Close', { useLastMatch: true });
}

async function openActionDiscoveryPanelThroughDesigner(cdp: CdpEvaluator, contextId: number, label: string): Promise<void> {
  console.log(`[workspace-lifecycle] ${label}: clicking Add an action`);
  let actionPanelOpened = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await clickDesignerElement(
      cdp,
      contextId,
      [
        '[data-automation-id^="msla-plus-button-"]',
        '[id^="msla-edge-button-"]',
        '[data-testid="card-Add an action"]',
        '[data-automation-id="card-Add_an_action"]',
        '[aria-label="Add an action"]',
      ],
      'Add an action',
      { requireTextMatch: false, useLastMatch: true }
    );

    if (await waitForOptionalDiscoveryPanelThroughDesigner(cdp, contextId, 2500)) {
      actionPanelOpened = true;
      break;
    }

    const clickedMenuItem = await tryClickDesignerElement(
      cdp,
      contextId,
      ['[data-automation-id^="msla-add-button-"]', '[role="menuitem"]'],
      'Add an action'
    );
    if (clickedMenuItem) {
      if (await waitForOptionalDiscoveryPanelThroughDesigner(cdp, contextId, 2500)) {
        actionPanelOpened = true;
        break;
      }
    }

    console.log(`[workspace-lifecycle] ${label}: Add Action panel did not open on attempt ${attempt}`);
  }
  assert.ok(actionPanelOpened, `${label} Add Action panel should open`);
  await waitForDiscoveryPanelThroughDesigner(cdp, contextId, 60000, `${label} action discovery panel`);
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-action-panel-open`);
}

async function handleMsnWeatherConnectionThroughDesigner(cdp: CdpEvaluator, contextId: number, label: string): Promise<void> {
  let lastState = '';
  await waitUntil(
    async () => {
      const state = await getDesignerConnectionOrParameterState(cdp, contextId);
      const stateText = JSON.stringify(state);
      if (stateText !== lastState) {
        lastState = stateText;
        console.log(`[workspace-lifecycle] ${label}: MSN Weather designer state ${stateText.slice(0, 1000)}`);
      }

      if (state.hasLocationParameter) {
        return true;
      }

      if (state.actionPoint) {
        await clickPoint(cdp, state.actionPoint);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return false;
      }

      return false;
    },
    240000,
    `${label} MSN Weather connection to be selected or created through designer. Last state: ${lastState}`
  );
}

async function configureResponseBodyThroughDesigner(
  cdp: CdpEvaluator,
  contextId: number,
  label: string,
  weatherActionName: string
): Promise<void> {
  await openResponseSettingsPanelThroughDesigner(cdp, contextId, label);
  await selectDynamicContentTokenForParameter(
    cdp,
    contextId,
    ['Body', 'body'],
    ['Get current weather', weatherActionName],
    ['Body', 'Outputs'],
    `${label} Response body`
  );
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-response-body-configured`);
}

async function openResponseSettingsPanelThroughDesigner(cdp: CdpEvaluator, contextId: number, label: string): Promise<void> {
  let lastError = '';
  for (let attempt = 1; attempt <= 5; attempt++) {
    await clickDesignerNodeByTitle(cdp, contextId, responseActionTitle);
    try {
      await waitForResponseDetailsPanel(cdp, contextId, 5000, `${label} Response details panel`);
      await waitForDesignerParameterEditor(cdp, contextId, ['Body', 'body'], 5000, `${label} Response Body editor`);
      return;
    } catch (error) {
      lastError = String(error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  assert.fail(`${label} Response settings panel should open before configuring Body. Last error: ${lastError}`);
}

async function clickDesignerNodeByTitle(cdp: CdpEvaluator, contextId: number, title: string): Promise<void> {
  const result = await cdp.evaluate<{
    ok: boolean;
    reason?: string;
    text?: string;
    point?: { x: number; y: number };
    candidates?: string[];
  }>(
    contextId,
    `(() => {
      const title = ${JSON.stringify(title.toLowerCase())};
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const exactId = 'msla-node-' + ${JSON.stringify(title === responseActionTitle ? responseActionTitle : title)};
      const exactNode = document.getElementById(exactId);
      const candidates = exactNode instanceof HTMLElement && isVisible(exactNode)
        ? [exactNode]
        : Array.from(document.querySelectorAll('.react-flow__node, [id^="msla-node-"]'))
          .filter(isVisible)
          .filter((element) => normalize(element.textContent).toLowerCase() === title || normalize(element.textContent).toLowerCase().includes(title));
      const debugCandidates = Array.from(document.querySelectorAll('.react-flow__node, [id^="msla-node-"]'))
        .filter(isVisible)
        .slice(0, 20)
        .map((element) => (element.id || '(no id)') + ' | ' + normalize(element.textContent).slice(0, 120));
      const element = candidates.at(-1);
      if (!element) {
        return { ok: false, reason: 'Designer node not found', candidates: debugCandidates, text: document.body?.innerText || '' };
      }

      element.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = element.getBoundingClientRect();
      return {
        ok: true,
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        text: normalize(element.textContent || element.getAttribute('aria-label') || ''),
      };
    })()`
  );

  assert.ok(
    result.ok && result.point,
    `Expected designer node "${title}". Reason=${result.reason} candidates=${JSON.stringify(result.candidates)} text=${String(
      result.text
    ).slice(0, 1000)}`
  );

  console.log(`[workspace-lifecycle] Clicking designer node "${title}" (${result.text ?? ''})`);
  await clickPoint(cdp, result.point);
}

async function clickDesignerCardByExactTitle(cdp: CdpEvaluator, contextId: number, title: string): Promise<void> {
  const result = await cdp.evaluate<{
    ok: boolean;
    reason?: string;
    text?: string;
    point?: { x: number; y: number };
    candidates?: string[];
  }>(
    contextId,
    `(() => {
      const title = ${JSON.stringify(title.toLowerCase())};
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const candidates = Array.from(document.querySelectorAll('[data-testid^="card-"], [data-automation-id^="card-"], [aria-label]'))
        .filter(isVisible)
        .filter((element) => {
          const text = normalize(element.textContent).toLowerCase();
          const aria = normalize(element.getAttribute('aria-label')).toLowerCase();
          const elementTitle = normalize(element.getAttribute('title')).toLowerCase();
          if (aria.includes('insert a new step')) {
            return false;
          }
          return text === title || aria === title || elementTitle === title;
        });
      const debugCandidates = Array.from(document.querySelectorAll('[data-testid^="card-"], [data-automation-id^="card-"], [aria-label]'))
        .filter(isVisible)
        .slice(0, 20)
        .map((element) => {
          const aid = normalize(element.getAttribute('data-automation-id'));
          const aria = normalize(element.getAttribute('aria-label'));
          const text = normalize(element.textContent).slice(0, 120);
          return aid + ' | ' + aria + ' | ' + text;
        });
      const element = candidates.at(-1);
      if (!element) {
        return { ok: false, reason: 'Exact card not found', candidates: debugCandidates, text: document.body?.innerText || '' };
      }

      element.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = element.getBoundingClientRect();
      return {
        ok: true,
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        text: normalize(element.textContent || element.getAttribute('aria-label') || ''),
      };
    })()`
  );

  assert.ok(
    result.ok && result.point,
    `Expected exact designer card "${title}". Reason=${result.reason} candidates=${JSON.stringify(result.candidates)} text=${String(
      result.text
    ).slice(0, 1000)}`
  );

  console.log(`[workspace-lifecycle] Clicking designer card "${title}" (${result.text ?? ''})`);
  await clickPoint(cdp, result.point);
}

async function waitForResponseDetailsPanel(cdp: CdpEvaluator, contextId: number, timeoutMs: number, description: string): Promise<void> {
  await waitUntil(
    () =>
      cdp.evaluate<boolean>(
        contextId,
        `(() => {
          const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
          const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
          const panelRoots = Array.from(document.querySelectorAll('.msla-panel-container, [id^="msla-node-details-panel"], [class*="panel"], div'))
            .filter(isVisible)
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.left > window.innerWidth * 0.35 && rect.width > 300 && rect.height > 250;
            });
          return panelRoots.some((panel) => {
            const text = normalize(panel.textContent);
            return text.includes('response') && text.includes('status code') && text.includes('body') && !text.includes('request body json schema');
          });
        })()`
      ),
    timeoutMs,
    description
  );
}

async function waitForDesignerParameterEditor(
  cdp: CdpEvaluator,
  contextId: number,
  labels: string[],
  timeoutMs: number,
  description: string
): Promise<void> {
  await waitUntil(
    () =>
      cdp.evaluate<boolean>(
        contextId,
        `(() => {
          const labels = ${JSON.stringify(labels.map((label) => label.toLowerCase()))};
          const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
          const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
          const isEditable = (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true';
          const editableSelectors = ['[contenteditable="true"].editor-input', '[contenteditable="true"]', 'textarea', 'input'];
          const labelCandidates = Array.from(document.querySelectorAll('label, span, div, p'))
            .filter(isVisible)
            .filter((element) => {
              const text = normalize(element.textContent).toLowerCase();
              return labels.some((label) => text === label || text.includes(label));
            });

          for (const label of labelCandidates) {
            let container = label;
            for (let depth = 0; depth < 6 && container; depth++) {
              const editable = editableSelectors
                .flatMap((selector) => Array.from(container.querySelectorAll(selector)))
                .filter(isVisible)
                .filter(isEditable)[0];
              if (editable instanceof HTMLElement) {
                return true;
              }
              container = container.parentElement;
            }
          }

          return false;
        })()`
      ),
    timeoutMs,
    description
  );
}

async function selectDynamicContentTokenForParameter(
  cdp: CdpEvaluator,
  contextId: number,
  parameterLabels: string[],
  sectionLabels: string[],
  tokenTitles: string[],
  description: string
): Promise<void> {
  const editorPoint = await getDesignerParameterEditorPoint(cdp, contextId, parameterLabels, description);
  await clickPoint(cdp, editorPoint);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const focusedState = await getDesignerElementStateAtPoint(cdp, contextId, editorPoint);
  console.log(`[workspace-lifecycle] Focused ${description} editor: ${JSON.stringify(focusedState).slice(0, 1000)}`);
  await captureLifecycleScreenshot(`workspace-lifecycle-${description.replace(/\W+/g, '-').toLowerCase()}-focused`);

  const entryPoint = await cdp.evaluate<{ ok: boolean; reason?: string; point?: { x: number; y: number }; text?: string }>(
    contextId,
    `(() => {
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const candidates = Array.from(document.querySelectorAll('[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]'))
        .filter(isVisible);
      const button = candidates.at(-1);
      if (!(button instanceof HTMLElement)) {
        return { ok: false, reason: 'Dynamic content entrypoint not found', text: document.body?.innerText || '' };
      }

      button.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = button.getBoundingClientRect();
      return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, text: button.textContent || button.getAttribute('aria-label') || '' };
    })()`
  );
  assert.ok(
    entryPoint.ok && entryPoint.point,
    `Expected dynamic-content picker button for ${description}. Reason=${entryPoint.reason} text=${entryPoint.text?.slice(0, 1000)}`
  );

  await clickPoint(cdp, entryPoint.point);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await captureLifecycleScreenshot(`workspace-lifecycle-${description.replace(/\W+/g, '-').toLowerCase()}-picker-open`);
  const selectedTokenText = await selectDynamicContentToken(cdp, contextId, sectionLabels, tokenTitles, description);
  console.log(`[workspace-lifecycle] Selected dynamic-content token for ${description}: ${selectedTokenText}`);
  await pressKey(cdp, 'Escape', 'Escape', 27);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const selectedState = await getDesignerElementStateAtPoint(cdp, contextId, editorPoint);
  console.log(`[workspace-lifecycle] Selected ${description} token state: ${JSON.stringify(selectedState).slice(0, 1000)}`);
  assert.ok(
    tokenTitles.some((title) =>
      String(selectedState.text ?? '')
        .toLowerCase()
        .includes(title.toLowerCase())
    ),
    `Expected ${description} editor to contain one of ${tokenTitles.join(', ')} after selecting ${selectedTokenText}. State: ${JSON.stringify(
      selectedState
    )}`
  );
}

async function getDesignerElementStateAtPoint(
  cdp: CdpEvaluator,
  contextId: number,
  point: { x: number; y: number }
): Promise<{
  tag?: string;
  text?: string;
  value?: string;
  placeholder?: string | null;
  ariaLabel?: string | null;
  activeTag?: string;
  activeValue?: string;
}> {
  return cdp.evaluate(
    contextId,
    `(() => {
      const point = ${JSON.stringify(point)};
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const element = document.elementFromPoint(point.x, point.y);
      const active = document.activeElement;
      const valueOf = (candidate) => candidate instanceof HTMLInputElement || candidate instanceof HTMLTextAreaElement ? candidate.value : undefined;
      return {
        tag: element?.tagName,
        text: normalize(element?.textContent || '').slice(0, 200),
        value: valueOf(element),
        placeholder: element?.getAttribute('placeholder'),
        ariaLabel: element?.getAttribute('aria-label'),
        activeTag: active?.tagName,
        activeValue: valueOf(active),
      };
    })()`
  );
}

async function selectDynamicContentToken(
  cdp: CdpEvaluator,
  contextId: number,
  sectionLabels: string[],
  tokenTitles: string[],
  description: string
): Promise<string> {
  const normalizedSectionLabels = sectionLabels.map((label) => label.toLowerCase());
  const normalizedTokenTitles = tokenTitles.map((title) => title.toLowerCase());
  let lastResultText = '';
  let selectedTokenText = '';

  await waitUntil(
    async () => {
      const result = await cdp.evaluate<{
        ok: boolean;
        expanded?: boolean;
        reason?: string;
        point?: { x: number; y: number };
        text?: string;
        candidates?: string[];
      }>(
        contextId,
        `(() => {
          const sectionLabels = ${JSON.stringify(normalizedSectionLabels)};
          const tokenTitles = ${JSON.stringify(normalizedTokenTitles)};
          const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
          const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
          const sectionNodes = Array.from(document.querySelectorAll('.msla-token-picker-section'));
          const debugCandidates = [];

          for (const section of sectionNodes) {
            if (!(section instanceof HTMLElement) || !isVisible(section)) {
              continue;
            }

            const header = section.querySelector('.msla-token-picker-section-header');
            const headerText = normalize(header?.textContent || section.getAttribute('aria-label') || '').toLowerCase();
            const sectionMatches = sectionLabels.some((label) => headerText.includes(label));
            const tokenButtons = Array.from(section.querySelectorAll('.msla-token-picker-section-option, [data-automation-id^="msla-token-picker-section-option-"]'))
              .filter(isVisible);

            for (const button of tokenButtons) {
              const title = normalize(button.querySelector('.msla-token-picker-option-title')?.textContent || button.textContent || '').toLowerCase();
              const description = normalize(button.querySelector('.msla-token-picker-option-description')?.textContent || '').toLowerCase();
              debugCandidates.push(headerText + ' :: ' + title + ' :: ' + description);
              if (!sectionMatches) {
                continue;
              }

              const tokenMatches = tokenTitles.some((tokenTitle) => title === tokenTitle || title.includes(tokenTitle));
              if (tokenMatches && button instanceof HTMLElement) {
                button.scrollIntoView({ block: 'center', inline: 'center' });
                const rect = button.getBoundingClientRect();
                return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, text: headerText + ' :: ' + title };
              }
            }

            const seeMoreButton = sectionMatches ? section.querySelector('.msla-token-picker-section-header-button') : undefined;
            if (seeMoreButton instanceof HTMLElement && isVisible(seeMoreButton) && /more/i.test(seeMoreButton.textContent || '')) {
              seeMoreButton.click();
              return { ok: false, expanded: true, text: headerText };
            }
          }

          return {
            ok: false,
            reason: 'Dynamic-content token not found',
            candidates: debugCandidates.slice(0, 50),
            text: document.body?.innerText || '',
          };
        })()`
      );

      lastResultText = JSON.stringify(result).slice(0, 2000);
      if (result.ok && result.point) {
        selectedTokenText = result.text ?? '';
        await clickPoint(cdp, result.point);
        return true;
      }

      return result.expanded === true ? false : false;
    },
    90000,
    `dynamic-content token for ${description}. Last state: ${lastResultText}`
  );
  return selectedTokenText;
}

async function getDesignerParameterEditorPoint(
  cdp: CdpEvaluator,
  contextId: number,
  labels: string[],
  description: string
): Promise<{ x: number; y: number }> {
  const focusResult = await cdp.evaluate<{
    ok: boolean;
    reason?: string;
    point?: { x: number; y: number };
    candidates?: string[];
    text?: string;
  }>(
    contextId,
    `(() => {
      const labels = ${JSON.stringify(labels.map((label) => label.toLowerCase()))};
      const normalize = (input) => (input || '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const editableSelectors = ['input:not([type="hidden"])', 'textarea', '[contenteditable="true"]'];
      const isEditable = (element) =>
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element.getAttribute('contenteditable') === 'true';
      const editables = () => editableSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter(isVisible).filter(isEditable);
      const elementText = (element) =>
        [
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('aria-labelledby')?.split(/\\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' '),
          element.getAttribute('data-testid'),
          element.getAttribute('data-automation-id'),
          element.getAttribute('placeholder'),
          element.getAttribute('title'),
        ]
          .map(normalize)
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
      const matches = (element) => labels.some((label) => elementText(element).includes(label));

      const direct = editables().find(matches);
      if (direct instanceof HTMLElement) {
        direct.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = direct.getBoundingClientRect();
        return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
      }

      const labelCandidates = Array.from(document.querySelectorAll('label, span, div, p, [data-automation-id], [data-testid]'))
        .filter(isVisible)
        .filter((element) => {
          const text = elementText(element);
          return labels.some((label) => text === label || text.includes(label));
        })
        .sort((a, b) => elementText(a).length - elementText(b).length);

      for (const label of labelCandidates) {
        const labelRect = label.getBoundingClientRect();
        const nearestEditable = editables()
          .map((editable) => ({ editable, rect: editable.getBoundingClientRect() }))
          .filter(({ rect }) => rect.top >= labelRect.top - 4 && rect.top <= labelRect.top + 140)
          .sort((a, b) => {
            const aDistance = Math.abs(a.rect.top - labelRect.bottom) + Math.abs(a.rect.left - labelRect.left) / 10;
            const bDistance = Math.abs(b.rect.top - labelRect.bottom) + Math.abs(b.rect.left - labelRect.left) / 10;
            return aDistance - bDistance;
          })[0];
        if (nearestEditable?.editable instanceof HTMLElement) {
          nearestEditable.editable.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = nearestEditable.editable.getBoundingClientRect();
          return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
        }

        let container = label;
        for (let depth = 0; depth < 6 && container; depth++) {
          const editable = editableSelectors
            .flatMap((selector) => Array.from(container.querySelectorAll(selector)))
            .filter(isVisible)
            .filter(isEditable)[0];
          if (editable instanceof HTMLElement) {
            editable.scrollIntoView({ block: 'center', inline: 'center' });
            const rect = editable.getBoundingClientRect();
            return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
          }
          container = container.parentElement;
        }
      }

      return {
        ok: false,
        reason: 'Parameter editor not found',
        candidates: editables().slice(0, 20).map((element) => elementText(element).slice(0, 160)),
        text: document.body?.innerText || '',
      };
    })()`
  );

  assert.ok(
    focusResult.ok && focusResult.point,
    `Expected ${description} parameter editor. Reason=${focusResult.reason} candidates=${JSON.stringify(
      focusResult.candidates
    )} text=${focusResult.text?.slice(0, 1000)}`
  );

  return focusResult.point;
}

async function getDesignerConnectionOrParameterState(
  cdp: CdpEvaluator,
  contextId: number
): Promise<{
  hasLocationParameter: boolean;
  hasActionOnCanvas: boolean;
  actionPoint?: { x: number; y: number };
  text: string;
  candidates: string[];
}> {
  return cdp.evaluate(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const bodyText = normalize(document.body?.innerText || '');
      const hasLocationParameter = Array.from(document.querySelectorAll('label, [aria-label], [data-testid], [data-automation-id], span, div'))
        .filter(isVisible)
        .some((element) => {
          const text = normalize(element.textContent).toLowerCase();
          const aria = normalize(element.getAttribute('aria-label')).toLowerCase();
          const testId = normalize(element.getAttribute('data-testid')).toLowerCase();
          const automationId = normalize(element.getAttribute('data-automation-id')).toLowerCase();
          return [text, aria, testId, automationId].some((value) => value === 'location' || value.includes('location'));
        });

      const hasActionOnCanvas = bodyText.toLowerCase().includes('get current weather');
      const clickableSelectors = [
        'button',
        '[role="button"]',
        '[role="row"]',
        '.msla-connection-table [role="row"]',
        '.msla-connection-row-display-name',
        '.msla-panel-root-CreateConnection button',
        '.msla-connections-panel-body button',
      ];
      const actionTexts = ['Create new', 'Create', 'Sign in', 'Connect', 'Use this connection', 'Select', 'MSN Weather', 'msnweather'];
      const candidates = clickableSelectors
        .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
        .filter(isVisible)
        .slice(0, 20)
        .map((element) => normalize(element.textContent || element.getAttribute('aria-label') || element.getAttribute('data-automation-id') || ''));

      for (const expected of actionTexts) {
        const lowerExpected = expected.toLowerCase();
        const element = clickableSelectors
          .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
          .filter(isVisible)
          .find((candidate) => {
            const text = normalize(candidate.textContent || candidate.getAttribute('aria-label') || candidate.getAttribute('data-automation-id') || '').toLowerCase();
            return text.includes(lowerExpected);
          });
        if (element instanceof HTMLElement) {
          element.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = element.getBoundingClientRect();
          return {
            hasLocationParameter,
            hasActionOnCanvas,
            actionPoint: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            text: bodyText,
            candidates,
          };
        }
      }

      return { hasLocationParameter, hasActionOnCanvas, text: bodyText, candidates };
    })()`
  );
}

async function fillDesignerParameter(
  cdp: CdpEvaluator,
  contextId: number,
  labels: string[],
  value: string,
  description: string
): Promise<void> {
  const focusResult = await cdp.evaluate<{
    ok: boolean;
    reason?: string;
    point?: { x: number; y: number };
    candidates?: string[];
    text?: string;
  }>(
    contextId,
    `(() => {
      const labels = ${JSON.stringify(labels.map((label) => label.toLowerCase()))};
      const normalize = (input) => (input || '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const editableSelectors = ['input:not([type="hidden"])', 'textarea', '[contenteditable="true"]'];
      const isEditable = (element) =>
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element.getAttribute('contenteditable') === 'true';
      const editables = () => editableSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter(isVisible).filter(isEditable);
      const elementText = (element) =>
        [
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('aria-labelledby')?.split(/\\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' '),
          element.getAttribute('data-testid'),
          element.getAttribute('data-automation-id'),
          element.getAttribute('placeholder'),
          element.getAttribute('title'),
        ]
          .map(normalize)
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
      const matches = (element) => labels.some((label) => elementText(element).includes(label));

      const direct = editables().find(matches);
      if (direct instanceof HTMLElement) {
        direct.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = direct.getBoundingClientRect();
        return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
      }

      const labelCandidates = Array.from(document.querySelectorAll('label, span, div, p, [data-automation-id], [data-testid]'))
        .filter(isVisible)
        .filter((element) => {
          const text = elementText(element);
          return labels.some((label) => text === label || text.includes(label));
        })
        .sort((a, b) => elementText(a).length - elementText(b).length);

      for (const label of labelCandidates) {
        let container = label;
        for (let depth = 0; depth < 6 && container; depth++) {
          const editable = editableSelectors
            .flatMap((selector) => Array.from(container.querySelectorAll(selector)))
            .filter(isVisible)
            .filter(isEditable)[0];
          if (editable instanceof HTMLElement) {
            editable.scrollIntoView({ block: 'center', inline: 'center' });
            const rect = editable.getBoundingClientRect();
            return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
          }
          container = container.parentElement;
        }
      }

      return {
        ok: false,
        reason: 'Parameter editor not found',
        candidates: editables().slice(0, 20).map((element) => elementText(element).slice(0, 160)),
        text: document.body?.innerText || '',
      };
    })()`
  );

  assert.ok(
    focusResult.ok && focusResult.point,
    `Expected ${description} parameter editor. Reason=${focusResult.reason} candidates=${JSON.stringify(
      focusResult.candidates
    )} text=${focusResult.text?.slice(0, 1000)}`
  );

  await clickPoint(cdp, focusResult.point);
  await replaceFocusedDesignerText(cdp, value);
}

async function replaceFocusedDesignerText(cdp: CdpEvaluator, value: string): Promise<void> {
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
    modifiers: 2,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'a',
    code: 'KeyA',
    windowsVirtualKeyCode: 65,
    nativeVirtualKeyCode: 65,
    modifiers: 2,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Backspace',
    code: 'Backspace',
    windowsVirtualKeyCode: 8,
    nativeVirtualKeyCode: 8,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Backspace',
    code: 'Backspace',
    windowsVirtualKeyCode: 8,
    nativeVirtualKeyCode: 8,
  });
  await cdp.send('Input.insertText', { text: value });
}

async function saveWorkflowThroughDesigner(cdp: CdpEvaluator, contextId: number, label: string): Promise<void> {
  console.log(`[workspace-lifecycle] ${label}: saving workflow through designer command bar`);
  await clickDesignerElement(cdp, contextId, ['button[aria-label="Save"]'], 'Save');
  await waitUntil(
    async () =>
      cdp.evaluate<boolean>(
        contextId,
        `(() => {
          const button = document.querySelector('button[aria-label="Save"]');
          const text = (button?.textContent || '').toLowerCase();
          const label = (button?.getAttribute('aria-label') || '').toLowerCase();
          return !text.includes('saving') && !label.includes('saving');
        })()`
      ),
    60000,
    `${label} designer save to complete`
  );
}

async function clickDesignerElement(
  cdp: CdpEvaluator,
  contextId: number,
  selectors: string[],
  textToFind: string,
  options: { requireTextMatch?: boolean; useLastMatch?: boolean } = {}
): Promise<void> {
  const result = await cdp.evaluate<{
    ok: boolean;
    reason?: string;
    text?: string;
    point?: { x: number; y: number };
    candidates?: string[];
  }>(
    contextId,
    `(() => {
      const selectors = ${JSON.stringify(selectors)};
      const textToFind = ${JSON.stringify(textToFind.toLowerCase())};
      const requireTextMatch = ${JSON.stringify(options.requireTextMatch !== false)};
      const useLastMatch = ${JSON.stringify(options.useLastMatch === true)};
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const matchesText = (element) => {
        const text = normalize(element.textContent).toLowerCase();
        const ariaLabel = normalize(element.getAttribute('aria-label')).toLowerCase();
        const title = normalize(element.getAttribute('title')).toLowerCase();
        return !requireTextMatch || !textToFind || text.includes(textToFind) || ariaLabel.includes(textToFind) || title.includes(textToFind);
      };
      const candidates = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
        .filter(isVisible)
        .filter(matchesText);
      const debugCandidates = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
        .filter(isVisible)
        .slice(0, 10)
        .map((element) => {
          const aid = normalize(element.getAttribute('data-automation-id'));
          const aria = normalize(element.getAttribute('aria-label'));
          const text = normalize(element.textContent).slice(0, 120);
          return aid + ' | ' + aria + ' | ' + text;
        });
      const element = useLastMatch ? candidates.at(-1) : candidates[0];
      if (!element) {
        return { ok: false, reason: 'Element not found', candidates: debugCandidates, text: document.body?.innerText || '' };
      }

      element.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = element.getBoundingClientRect();
      return {
        ok: true,
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        text: normalize(element.textContent || element.getAttribute('aria-label') || ''),
      };
    })()`
  );

  assert.ok(
    result.ok && result.point,
    `Expected clickable designer element "${textToFind}". Reason=${result.reason} candidates=${JSON.stringify(result.candidates)} text=${String(
      result.text
    ).slice(0, 1000)}`
  );

  console.log(`[workspace-lifecycle] Clicking designer element "${textToFind}" (${result.text ?? ''})`);
  await clickPoint(cdp, result.point);
}

async function tryClickDesignerElement(
  cdp: CdpEvaluator,
  contextId: number,
  selectors: string[],
  textToFind: string,
  options: { requireTextMatch?: boolean; useLastMatch?: boolean } = {}
): Promise<boolean> {
  try {
    await clickDesignerElement(cdp, contextId, selectors, textToFind, options);
    return true;
  } catch (error) {
    console.log(`[workspace-lifecycle] Optional designer element "${textToFind}" was not clickable: ${String(error)}`);
    return false;
  }
}

async function hasDiscoveryPanelThroughDesigner(cdp: CdpEvaluator, contextId: number): Promise<boolean> {
  return cdp.evaluate<boolean>(
    contextId,
    `(() => {
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      return [
        '.msla-panel-root-Discovery',
        '[class*="panel-root"]',
        '[data-automation-id="msla-search-box"]',
        '.msla-search-box',
        'input[placeholder*="Search"]',
      ].some((selector) => Array.from(document.querySelectorAll(selector)).some(isVisible));
    })()`
  );
}

async function waitForDiscoveryPanelThroughDesigner(
  cdp: CdpEvaluator,
  contextId: number,
  timeoutMs: number,
  description: string
): Promise<void> {
  await waitUntil(() => hasDiscoveryPanelThroughDesigner(cdp, contextId), timeoutMs, description);
}

async function waitForOptionalDiscoveryPanelThroughDesigner(cdp: CdpEvaluator, contextId: number, timeoutMs: number): Promise<boolean> {
  try {
    await waitForDiscoveryPanelThroughDesigner(cdp, contextId, timeoutMs, 'optional designer discovery panel');
    return true;
  } catch {
    return false;
  }
}

async function searchInDiscoveryPanelThroughDesigner(cdp: CdpEvaluator, contextId: number, searchTerm: string): Promise<void> {
  const result = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; value?: string }>(
    contextId,
    `(() => {
      const searchTerm = ${JSON.stringify(searchTerm)};
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const selectors = [
        '[data-automation-id="msla-search-box"] input',
        '[data-automation-id="msla-search-box"]',
        '.msla-search-box input',
        '.msla-search-box',
        'input[placeholder*="Search"]',
        'input[type="text"]',
      ];
      for (const selector of selectors) {
        const element = Array.from(document.querySelectorAll(selector)).find(isVisible);
        if (!element) {
          continue;
        }

        const input = element instanceof HTMLInputElement ? element : element.querySelector('input');
        if (!(input instanceof HTMLInputElement)) {
          continue;
        }

        input.scrollIntoView({ block: 'center', inline: 'center' });
        input.focus();
        input.select();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, searchTerm);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: searchTerm }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return {
          ok: true,
          text: input.placeholder || input.getAttribute('aria-label') || '',
          value: input.value,
        };
      }

      return { ok: false, reason: 'Search input not found', text: document.body?.innerText || '' };
    })()`
  );

  assert.ok(
    result.ok && result.value === searchTerm,
    `Expected designer search input for "${searchTerm}". Reason=${result.reason} value=${result.value} text=${result.text?.slice(0, 1000)}`
  );
}

async function waitForSearchResultsThroughDesigner(
  cdp: CdpEvaluator,
  contextId: number,
  timeoutMs: number,
  description: string
): Promise<void> {
  await waitUntil(
    () =>
      cdp.evaluate<boolean>(
        contextId,
        `(() => {
          const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
          const selectors = [
            '[data-automation-id^="msla-op-search-result-"]',
            '[data-testid^="msla-op-search-result-"]',
            '.msla-op-search-card-container',
            '.msla-op-search-card',
            '.msla-recommendation-panel-card',
            '[role="option"]',
          ];
          return selectors.some((selector) => Array.from(document.querySelectorAll(selector)).some(isVisible));
        })()`
      ),
    timeoutMs,
    description
  );
}

async function selectOperationThroughDesigner(
  cdp: CdpEvaluator,
  contextId: number,
  operationName: string,
  variants: string[]
): Promise<void> {
  let result:
    | {
        ok: boolean;
        reason?: string;
        point?: { x: number; y: number };
        text?: string;
        candidates?: string[];
      }
    | undefined;

  for (let attempt = 0; attempt < 20; attempt++) {
    result = await cdp.evaluate(
      contextId,
      `(() => {
      const variants = ${JSON.stringify([operationName, ...variants].map((variant) => variant.toLowerCase()))};
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const selectors = [
        '[data-automation-id^="msla-op-search-result-"]',
        '[data-testid^="msla-op-search-result-"]',
        '.msla-op-search-card-container',
        '.msla-op-search-card',
        '.msla-recommendation-panel-card',
        '[role="option"]',
        '[class*="connector"] [role="button"]',
        '[class*="connector"] button',
      ];
      const cards = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector))).filter(isVisible);
      const candidates = cards.slice(0, 12).map((element) => {
        const aid = normalize(element.getAttribute('data-automation-id'));
        const aria = normalize(element.getAttribute('aria-label'));
        const text = normalize(element.textContent).slice(0, 160);
        return aid + ' | ' + aria + ' | ' + text;
      });

      const exactOperationName = variants[0];
      const getCardDetails = (card) => {
        const title = normalize(card.querySelector('.msla-op-search-card-title')?.textContent);
        const text = normalize(title || card.textContent).toLowerCase();
        const aria = normalize(card.getAttribute('aria-label')).toLowerCase();
        const aid = normalize(card.getAttribute('data-automation-id')).toLowerCase();
        return { title, text, aria, aid, combined: text + ' ' + aria + ' ' + aid };
      };
      const exactCard = cards.find((card) => getCardDetails(card).text === exactOperationName);
      if (exactCard) {
        exactCard.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = exactCard.getBoundingClientRect();
        return {
          ok: true,
          point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          text: normalize(getCardDetails(exactCard).title || exactCard.textContent || exactCard.getAttribute('aria-label') || ''),
          candidates,
        };
      }

      for (const card of cards) {
        const { title, text, combined } = getCardDetails(card);
        if (combined === 'all' || combined.startsWith('all ')) {
          continue;
        }
        if (exactOperationName === 'get current weather' && text.includes(exactOperationName) && text !== exactOperationName && !combined.includes('msnweather')) {
          continue;
        }

        if (variants.some((variant) => combined.includes(variant))) {
          card.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = card.getBoundingClientRect();
          return {
            ok: true,
            point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            text: normalize(title || card.textContent || card.getAttribute('aria-label') || ''),
            candidates,
          };
        }
      }

      return { ok: false, reason: 'Operation card not found', candidates, text: document.body?.innerText || '' };
    })()`
    );

    if (result?.ok && result.point) {
      console.log(`[workspace-lifecycle] Selecting operation "${operationName}" (${result.text ?? ''})`);
      await clickPoint(cdp, result.point);
      return;
    }

    await scrollDesignerSearchResults(cdp, contextId);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  assert.ok(
    result?.ok && result.point,
    `Expected operation card "${operationName}". Reason=${result?.reason} candidates=${JSON.stringify(result?.candidates)} text=${String(
      result?.text
    ).slice(0, 1000)}`
  );
}

async function scrollDesignerSearchResults(cdp: CdpEvaluator, contextId: number): Promise<void> {
  await cdp.evaluate(
    contextId,
    `(() => {
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const scrollContainers = Array.from(document.querySelectorAll('div'))
        .filter(isVisible)
        .filter((element) => {
          const style = getComputedStyle(element);
          return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 20;
        })
        .sort((a, b) => b.clientHeight - a.clientHeight);
      const container = scrollContainers.find((element) => element.textContent?.includes('connector results found')) ?? scrollContainers[0];
      if (container) {
        container.scrollTop += 650;
      } else {
        window.scrollBy(0, 650);
      }
    })()`
  );
}

async function waitForDesignerText(
  cdp: CdpEvaluator,
  contextId: number,
  expectedText: string[],
  timeoutMs: number,
  description: string
): Promise<void> {
  await waitUntil(
    () =>
      cdp.evaluate<boolean>(
        contextId,
        `(() => {
          const collectText = (root) => {
            let text = '';
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            let node = walker.currentNode;
            while (node) {
              if (node instanceof HTMLScriptElement || node instanceof HTMLStyleElement) {
                node = walker.nextSibling() || walker.nextNode();
                continue;
              }
              if (node.parentElement instanceof HTMLScriptElement || node.parentElement instanceof HTMLStyleElement) {
                node = walker.nextNode();
                continue;
              }
              if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent || '';
              }
              if (node.shadowRoot) {
                text += collectText(node.shadowRoot);
              }
              if (node instanceof HTMLIFrameElement && node.contentDocument) {
                text += collectText(node.contentDocument);
              }
              node = walker.nextNode();
            }
            return text;
          };
          const text = collectText(document).toLowerCase();
          return ${JSON.stringify(expectedText.map((text) => text.toLowerCase()))}.some((expected) => text.includes(expected));
        })()`
      ),
    timeoutMs,
    description
  );
}

async function getDesignerText(cdp: CdpEvaluator, contextId: number): Promise<string> {
  return cdp.evaluate<string>(
    contextId,
    `(() => {
      const collectText = (root) => {
        let text = '';
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let node = walker.currentNode;
        while (node) {
          if (node instanceof HTMLScriptElement || node instanceof HTMLStyleElement) {
            node = walker.nextSibling() || walker.nextNode();
            continue;
          }
          if (node.parentElement instanceof HTMLScriptElement || node.parentElement instanceof HTMLStyleElement) {
            node = walker.nextNode();
            continue;
          }
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || '';
          }
          if (node.shadowRoot) {
            text += collectText(node.shadowRoot);
          }
          if (node instanceof HTMLIFrameElement && node.contentDocument) {
            text += collectText(node.contentDocument);
          }
          node = walker.nextNode();
        }
        return text;
      };
      return collectText(document);
    })()`
  );
}

async function waitForSavedWorkflowContainsDesignerChanges(createdWorkspace: CreatedWorkspace): Promise<SavedWorkflowOperations> {
  let operations: SavedWorkflowOperations | undefined;
  await waitUntil(
    () => {
      operations = tryGetSavedWorkflowOperations(createdWorkspace);
      return operations !== undefined;
    },
    60000,
    `${createdWorkspace.label} workflow.json to contain UI-created Request trigger and Response action`
  );

  assert.ok(operations, `Expected saved workflow operations for ${createdWorkspace.label}`);
  console.log(
    `[workspace-lifecycle] ${createdWorkspace.label}: saved Request trigger "${operations.requestTriggerName}" and Response action "${operations.responseActionName}"`
  );
  return operations;
}

function getSavedWorkflowOperations(createdWorkspace: CreatedWorkspace): SavedWorkflowOperations {
  const operations = tryGetSavedWorkflowOperations(createdWorkspace);
  assert.ok(operations, `Expected ${createdWorkspace.workflowJsonPath} to contain a saved Request trigger and Response action`);
  return operations;
}

function tryGetSavedWorkflowOperations(createdWorkspace: CreatedWorkspace): SavedWorkflowOperations | undefined {
  const workflowJson = JSON.parse(fs.readFileSync(createdWorkspace.workflowJsonPath, 'utf-8'));
  const triggers = workflowJson?.definition?.triggers ?? {};
  const actions = workflowJson?.definition?.actions ?? {};
  const requestTriggerEntry = Object.entries(triggers).find(([, trigger]) => {
    const triggerRecord = trigger as Record<string, unknown>;
    return String(triggerRecord.type ?? '').toLowerCase() === 'request' || String(triggerRecord.kind ?? '').toLowerCase() === 'http';
  });
  const responseActionEntry = Object.entries(actions).find(([, action]) => {
    const actionRecord = action as Record<string, unknown>;
    return String(actionRecord.type ?? '').toLowerCase() === 'response';
  });

  if (!requestTriggerEntry || !responseActionEntry) {
    return undefined;
  }

  return {
    requestTriggerName: requestTriggerEntry[0],
    responseActionName: responseActionEntry[0],
  };
}

function getSavedWorkflowRunEvidence(createdWorkspace: CreatedWorkspace): {
  requestTriggerName: string;
  expectedActionNames: string[];
} {
  const workflowJson = JSON.parse(fs.readFileSync(createdWorkspace.workflowJsonPath, 'utf-8'));
  const triggers = workflowJson?.definition?.triggers ?? {};
  const actions = workflowJson?.definition?.actions ?? {};
  const requestTriggerEntry = Object.entries(triggers).find(([, trigger]) => {
    const triggerRecord = trigger as Record<string, unknown>;
    return String(triggerRecord.type ?? '').toLowerCase() === 'request' || String(triggerRecord.kind ?? '').toLowerCase() === 'http';
  });
  assert.ok(requestTriggerEntry, `Expected ${createdWorkspace.workflowJsonPath} to contain a Request trigger`);

  const actionEntries = Object.entries(actions);
  assert.ok(actionEntries.length > 0, `Expected ${createdWorkspace.workflowJsonPath} to contain at least one action`);

  if (createdWorkspace.appType === 'standard') {
    const responseActionEntry = actionEntries.find(([, action]) => {
      const actionRecord = action as Record<string, unknown>;
      return String(actionRecord.type ?? '').toLowerCase() === 'response';
    });
    assert.ok(responseActionEntry, `Expected ${createdWorkspace.workflowJsonPath} to contain a Response action`);
    return {
      requestTriggerName: requestTriggerEntry[0],
      expectedActionNames: actionEntries.map(([actionName]) => actionName),
    };
  }

  const invokeFunctionActionNames = actionEntries
    .filter(([, action]) => String((action as Record<string, unknown>).type ?? '').toLowerCase() === 'invokefunction')
    .map(([actionName]) => actionName);
  assert.ok(
    invokeFunctionActionNames.length > 0,
    `Expected ${createdWorkspace.workflowJsonPath} to contain an InvokeFunction action. Actions=${JSON.stringify(actionEntries.map(([name]) => name))}`
  );

  return {
    requestTriggerName: requestTriggerEntry[0],
    expectedActionNames: invokeFunctionActionNames,
  };
}

function getSavedMsnWeatherWorkflowEvidence(createdWorkspace: CreatedWorkspace): {
  requestTriggerName: string;
  weatherActionName: string;
  responseActionName: string;
} {
  const workflowJson = JSON.parse(fs.readFileSync(createdWorkspace.workflowJsonPath, 'utf-8'));
  const triggers = workflowJson?.definition?.triggers ?? {};
  const triggerEntries = Object.entries(triggers);
  const requestTriggerEntry = triggerEntries.find(([, trigger]) => {
    const triggerRecord = trigger as Record<string, unknown>;
    return String(triggerRecord.type ?? '').toLowerCase() === 'request';
  });
  const actions = workflowJson?.definition?.actions ?? {};
  const actionEntries = Object.entries(actions);
  const weatherActionEntry = actionEntries.find(([name, action]) => {
    const actionRecord = action as Record<string, any>;
    const referenceName = actionRecord.inputs?.host?.connection?.referenceName;
    const actionName = name.toLowerCase();
    return (
      String(actionRecord.type ?? '').toLowerCase() === 'apiconnection' &&
      (String(referenceName ?? '')
        .toLowerCase()
        .includes(msnWeatherConnectionReferenceName) ||
        actionName.includes('current_weather') ||
        actionName.includes('weather'))
    );
  });
  const responseActionEntry = actionEntries.find(([, action]) => {
    const actionRecord = action as Record<string, unknown>;
    return String(actionRecord.type ?? '').toLowerCase() === 'response';
  });

  assert.ok(
    weatherActionEntry,
    `Expected ${createdWorkspace.workflowJsonPath} to contain a designer-authored MSN Weather action. Actions=${JSON.stringify(
      actionEntries.map(([name]) => name)
    )}`
  );
  assert.ok(
    requestTriggerEntry,
    `Expected ${createdWorkspace.workflowJsonPath} to contain a designer-authored Request trigger. Triggers=${JSON.stringify(
      triggerEntries.map(([name]) => name)
    )}`
  );
  assert.ok(responseActionEntry, `Expected ${createdWorkspace.workflowJsonPath} to contain a Response action`);

  return {
    requestTriggerName: requestTriggerEntry[0],
    weatherActionName: weatherActionEntry[0],
    responseActionName: responseActionEntry[0],
  };
}

function assertGeneratedWorkflowReadyForRuntime(createdWorkspace: CreatedWorkspace): void {
  const evidence = getSavedWorkflowRunEvidence(createdWorkspace);
  assert.ok(evidence.requestTriggerName, `Expected ${createdWorkspace.label} generated workflow to have a request trigger`);
  assert.ok(evidence.expectedActionNames.length > 0, `Expected ${createdWorkspace.label} generated workflow to have runnable actions`);
  console.log(
    `[workspace-lifecycle] ${createdWorkspace.label}: generated workflow trigger="${evidence.requestTriggerName}", actions=${JSON.stringify(
      evidence.expectedActionNames
    )}`
  );
}

function buildCustomCodeProjectIfNeeded(createdWorkspace: CreatedWorkspace): void {
  if (createdWorkspace.appType === 'standard') {
    return;
  }

  const customCodeProjectPaths = getCustomCodeProjectPaths(createdWorkspace);
  assert.ok(
    customCodeProjectPaths.length > 0,
    `Expected ${createdWorkspace.label} workspace to include a custom-code project folder. Folders: ${createdWorkspace.folderPaths.join(', ')}`
  );

  const dotnetPath = vscode.workspace.getConfiguration('azureLogicAppsStandard').get<string>('dotnetBinaryPath') ?? 'dotnet';
  for (const projectPath of customCodeProjectPaths) {
    const csprojPath = fs.readdirSync(projectPath).find((entry) => entry.endsWith('.csproj'));
    assert.ok(csprojPath, `Expected a .csproj file under ${projectPath}`);

    console.log(`[workspace-lifecycle] ${createdWorkspace.label}: building custom-code project ${path.join(projectPath, csprojPath)}`);
    try {
      const output = execFileSync(dotnetPath, ['build', path.join(projectPath, csprojPath), '--nologo'], {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 180000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      console.log(`[workspace-lifecycle] ${createdWorkspace.label}: custom-code build output\n${output}`);
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      assert.fail(
        `${createdWorkspace.label} custom-code build failed. stdout=${execError.stdout ?? ''} stderr=${
          execError.stderr ?? ''
        } message=${execError.message ?? String(error)}`
      );
    }
  }
}

async function waitForCustomCodeRuntimeArtifactsIfNeeded(createdWorkspace: CreatedWorkspace): Promise<void> {
  if (createdWorkspace.appType === 'standard') {
    return;
  }

  const invokeFunctionNames = getSavedWorkflowInvokeFunctionNames(createdWorkspace);
  assert.ok(
    invokeFunctionNames.length > 0,
    `Expected ${createdWorkspace.label} workflow to contain an InvokeFunction action before debug. Workflow: ${fs
      .readFileSync(createdWorkspace.workflowJsonPath, 'utf-8')
      .slice(0, 2000)}`
  );

  await waitUntil(
    () =>
      invokeFunctionNames.every((functionName) =>
        fs.existsSync(path.join(createdWorkspace.appDir, 'lib', 'custom', functionName, 'function.json'))
      ),
    180000,
    `${createdWorkspace.label} custom-code function metadata under lib\\custom. Expected functions=${invokeFunctionNames.join(
      ', '
    )}. Files=${JSON.stringify(getCustomCodeDiagnosticFiles(createdWorkspace.appDir))}`
  );
}

function getSavedWorkflowInvokeFunctionNames(createdWorkspace: CreatedWorkspace): string[] {
  const workflowJson = JSON.parse(fs.readFileSync(createdWorkspace.workflowJsonPath, 'utf-8'));
  const actions = workflowJson?.definition?.actions ?? {};
  return Object.values(actions)
    .filter((action) => String((action as Record<string, unknown>).type ?? '').toLowerCase() === 'invokefunction')
    .map((action) => String((((action as Record<string, unknown>).inputs as Record<string, unknown> | undefined) ?? {}).functionName ?? ''))
    .filter((functionName) => functionName.length > 0);
}

function getCustomCodeProjectPaths(createdWorkspace: CreatedWorkspace): string[] {
  return createdWorkspace.folderPaths.filter((folderPath) => folderPath !== createdWorkspace.appDir && hasCsproj(folderPath));
}

function getCustomCodeDiagnosticFiles(appDir: string): string[] {
  const customCodePath = path.join(appDir, 'lib', 'custom');
  if (!fs.existsSync(customCodePath)) {
    return [];
  }

  return walkFiles(customCodePath).map((filePath) => path.relative(appDir, filePath));
}

async function startDebuggingGeneratedWorkspace(
  createdWorkspace: CreatedWorkspace,
  options: { cleanupBeforeDebug?: boolean; requireHostRunning?: boolean; useAzureConnectors?: boolean } = {}
): Promise<void> {
  const cleanupBeforeDebug = options.cleanupBeforeDebug !== false;
  const requireHostRunning = options.requireHostRunning !== false;
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(createdWorkspace.appDir));
  assert.ok(folder, `Expected ${createdWorkspace.appDir} to be open as a workspace folder`);

  const launchPath = path.join(createdWorkspace.appDir, '.vscode', 'launch.json');
  const launchJson = JSON.parse(fs.readFileSync(launchPath, 'utf-8')) as {
    configurations?: Record<string, unknown>[];
  };
  const generatedConfig = launchJson.configurations?.[0];
  assert.ok(generatedConfig, `Expected ${launchPath} to contain a debug configuration`);
  assert.ok(generatedConfig.name, `Expected ${launchPath} debug configuration to have a name`);

  if (cleanupBeforeDebug) {
    await stopDebuggingAndTasks();
    await killPortsBound([7071, ...azuritePorts]);
  }
  console.log(`[workspace-lifecycle] Starting debug for ${createdWorkspace.workflowJsonPath} with ${String(generatedConfig.name)}`);
  await logAzuriteDiagnostics('before debug autostart', createdWorkspace.appDir);
  try {
    let startDebuggingOutcome: { started?: boolean; error?: unknown } | undefined;
    const monitorStartDebugging = async () => {
      try {
        const started = await vscode.debug.startDebugging(folder, generatedConfig as vscode.DebugConfiguration);
        startDebuggingOutcome = { started };
      } catch (error) {
        startDebuggingOutcome = { error };
      }
    };
    const startDebuggingMonitor = monitorStartDebugging();

    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-debug-starting`);
    await handleWorkbenchPrompts([
      {
        matchText: 'Enable connectors in Azure',
        optionText: options.useAzureConnectors === true ? 'Use connectors from Azure' : 'Skip for now',
      },
      { matchText: 'Configure Azurite to autostart on project debug?', optionText: 'Enable AutoStart' },
      { matchText: 'Failed to verify "AzureWebJobsStorage" connection', optionText: 'Debug anyway' },
    ]);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-debug-prompts-handled`);
    await waitForDebugStartup(createdWorkspace, () => startDebuggingOutcome, 300000, { requireHostRunning });
    await Promise.race([startDebuggingMonitor, Promise.resolve(undefined)]);
  } catch (error) {
    await logAzuriteDiagnostics('debug autostart failure', createdWorkspace.appDir);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-debug-failure`);
    throw error;
  }
  await logAzuriteDiagnostics('after debug autostart', createdWorkspace.appDir);
}

async function waitForDebugStartup(
  createdWorkspace: CreatedWorkspace,
  getStartDebuggingOutcome: () => { started?: boolean; error?: unknown } | undefined,
  timeoutMs: number,
  options: { requireHostRunning?: boolean } = {}
): Promise<void> {
  const requireHostRunning = options.requireHostRunning !== false;
  await waitUntil(
    async () => {
      const outcome = getStartDebuggingOutcome();
      if (outcome?.error) {
        throw outcome.error;
      }
      if (outcome?.started === false) {
        throw new Error(`VS Code reported startDebugging=false for ${createdWorkspace.appDir}`);
      }

      const debugOrTaskStarted =
        outcome?.started === true ||
        !!vscode.debug.activeDebugSession ||
        vscode.tasks.taskExecutions.some((execution) => execution.task.name.toLowerCase().includes('func: host start'));

      return debugOrTaskStarted && (!requireHostRunning || (await isHostRunning()));
    },
    timeoutMs,
    `debug launch${requireHostRunning ? ' plus Functions host Running state' : ''} for ${createdWorkspace.appDir}`
  );
}

async function runWorkflowThroughOverviewAndAssertSucceeded(createdWorkspace: CreatedWorkspace): Promise<{ name: string; status: string }> {
  const workflowName = createdWorkspace.wfName;
  const runEvidence = getSavedWorkflowRunEvidence(createdWorkspace);
  await waitForWorkflowReadyForOverviewRun(workflowName, runEvidence.requestTriggerName);
  const previousRunName = await getLatestRunName(workflowName);

  await openOverviewAndClickRunTrigger(createdWorkspace, previousRunName);

  const run = await waitForLatestRunStatus(workflowName, 'Succeeded', 180000, previousRunName);
  const actionStatuses = await getLatestRunActionStatuses(workflowName, run.name);
  assert.ok(actionStatuses.length > 0, `Expected action status evidence for workflow ${workflowName}, run ${run.name}`);

  const failedActions = actionStatuses.filter((action) => action.status !== 'Succeeded');
  assert.deepStrictEqual(failedActions, [], `Expected all workflow actions to succeed. Actions: ${JSON.stringify(actionStatuses)}`);
  for (const expectedActionName of runEvidence.expectedActionNames) {
    assert.ok(
      actionStatuses.some((action) => action.name === expectedActionName),
      `Expected action ${expectedActionName} to appear in run history. Actions: ${JSON.stringify(actionStatuses)}`
    );
  }

  return run;
}

async function runNugetConversionLifecycle(createdWorkspace: CreatedWorkspace): Promise<void> {
  assert.strictEqual(createdWorkspace.appType, 'standard', 'NuGet conversion lifecycle expects a Standard Stateful workspace');
  console.log(`[workspace-lifecycle][nuget] Running bundle-to-NuGet lifecycle from ${createdWorkspace.appDir}`);
  ensureLocalSettingsForDesigner(createdWorkspace.appDir);
  await waitForGeneratedLogicAppFolder(createdWorkspace);
  seedRunnableStandardWorkflow(createdWorkspace);
  await waitForPathExists(path.join(createdWorkspace.appDir, 'host.json'), 45000);
  await waitForPathExists(path.join(createdWorkspace.appDir, '.vscode', 'tasks.json'), 45000);

  await startDebuggingGeneratedWorkspace(createdWorkspace);
  await runWorkflowThroughOverviewAndAssertSucceeded(createdWorkspace);
  await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-bundle-run-succeeded`);
  await stopDebuggingOnly();
  await closeAllTabs();

  await convertBundleProjectToNuget(createdWorkspace);
  await waitForConvertedNugetProject(createdWorkspace);
  assertRunnableStandardWorkflow(createdWorkspace, 'nuget');
  await assertNoForbiddenWorkbenchPrompts('post-conversion');

  await startDebuggingGeneratedWorkspace(createdWorkspace, { cleanupBeforeDebug: false });
  await assertNoForbiddenWorkbenchPrompts('post-conversion debug start');
  await runWorkflowThroughOverviewAndAssertSucceeded(createdWorkspace);
  await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-nuget-run-succeeded`);
  await assertNoForbiddenWorkbenchPrompts('post-conversion run');
  await stopDebuggingAndTasks();
}

async function convertBundleProjectToNuget(createdWorkspace: CreatedWorkspace): Promise<void> {
  console.log(`[workspace-lifecycle][nuget] Converting ${createdWorkspace.appDir} to NuGet`);
  const conversion = withAllowedDialogResponses(
    [
      { message: /move.*NuGet-based project/i, response: 'Move to a NuGet-based project' },
      { message: /Initialize project for use with VS Code/i, response: 'Yes' },
      { message: /\.vscode/i, response: 'Yes' },
    ],
    () => Promise.resolve(vscode.commands.executeCommand(switchToDotnetProjectCommand, vscode.Uri.file(createdWorkspace.appDir)))
  ).then(
    () => ({ ok: true as const }),
    (error) => ({ ok: false as const, error })
  );
  const result = await withTimeout(conversion, 600000, 'bundle-to-NuGet conversion command');
  if (!result.ok) {
    throw result.error;
  }
}

async function waitForConvertedNugetProject(createdWorkspace: CreatedWorkspace): Promise<void> {
  await waitUntil(
    () => {
      try {
        assertConvertedNugetProject(createdWorkspace.appDir, createdWorkspace.appName, createdWorkspace.wfName);
        return true;
      } catch {
        return false;
      }
    },
    180000,
    `converted NuGet project artifacts under ${createdWorkspace.appDir}`
  );
  assertConvertedNugetProject(createdWorkspace.appDir, createdWorkspace.appName, createdWorkspace.wfName);
}

function seedRunnableStandardWorkflow(createdWorkspace: CreatedWorkspace): void {
  fs.mkdirSync(path.dirname(createdWorkspace.workflowJsonPath), { recursive: true });
  fs.writeFileSync(
    createdWorkspace.workflowJsonPath,
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
      null,
      2
    )}\n`
  );
}

function assertRunnableStandardWorkflow(createdWorkspace: CreatedWorkspace, phase: string): void {
  const workflowJson = readJsonFile<Record<string, any>>(createdWorkspace.workflowJsonPath);
  const triggers = workflowJson.definition?.triggers ?? {};
  const actions = workflowJson.definition?.actions ?? {};

  assert.strictEqual(triggers.manual?.type, 'Request', `${phase}: workflow should use the built-in Request trigger`);
  assert.strictEqual(actions.Response?.type, 'Response', `${phase}: workflow should use the built-in Response action`);
}

async function runMsnWeatherLifecycle(createdWorkspace: CreatedWorkspace): Promise<void> {
  assert.strictEqual(createdWorkspace.appType, 'standard', 'MSN Weather lifecycle expects a Standard Stateful workspace');
  console.log(`[workspace-lifecycle][msn-weather] Running MSN Weather lifecycle from ${createdWorkspace.appDir}`);

  const settings = getMsnWeatherAzureSettingsFromEnvironment();
  try {
    if (settings) {
      ensureLocalSettingsForMsnWeather(createdWorkspace.appDir, settings);
    } else {
      console.log(
        '[workspace-lifecycle][msn-weather] Azure settings env vars were not provided; designer will prompt for Azure connector setup.'
      );
    }
    await waitForGeneratedLogicAppFolder(createdWorkspace);
    await openDesignerAndCreateWorkflow(createdWorkspace, { includeMsnWeather: true, useAzureConnectors: true });
    assertMsnWeatherLocalSettingsReady(createdWorkspace.appDir);
    assertMsnWeatherStandardWorkflow(createdWorkspace);
    await waitForPathExists(path.join(createdWorkspace.appDir, 'host.json'), 45000);
    await waitForPathExists(path.join(createdWorkspace.appDir, '.vscode', 'tasks.json'), 45000);

    await startDebuggingGeneratedWorkspace(createdWorkspace, { useAzureConnectors: true });
    const run = await runWorkflowThroughOverviewAndAssertSucceeded(createdWorkspace);
    await openRunDetailsThroughOverview(createdWorkspace, run.name);
    await assertRunResponseReturnsMsnWeatherConditions(createdWorkspace, run.name);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-msn-weather-response-verified`);
  } finally {
    await stopDebuggingAndTasks();
  }
}

function getMsnWeatherAzureSettingsFromEnvironment(): MsnWeatherAzureSettings | undefined {
  const subscriptionId = optionalEnvironmentValue(['LA_E2E_CLI_AZURE_SUBSCRIPTION_ID', 'WORKFLOWS_SUBSCRIPTION_ID']);
  const resourceGroupName = optionalEnvironmentValue(['LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME', 'WORKFLOWS_RESOURCE_GROUP_NAME']);
  const location = optionalEnvironmentValue(['LA_E2E_CLI_AZURE_LOCATION_NAME', 'WORKFLOWS_LOCATION_NAME']);
  if (!subscriptionId && !resourceGroupName && !location) {
    return undefined;
  }

  assert.ok(
    subscriptionId && resourceGroupName && location,
    [
      'MSN Weather lifecycle Azure env var preseed is incomplete.',
      'Set LA_E2E_CLI_AZURE_SUBSCRIPTION_ID, LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME, and LA_E2E_CLI_AZURE_LOCATION_NAME together,',
      'or omit all three and let the designer Azure connector wizard populate local.settings.json from the signed-in VS Code profile.',
    ].join(' ')
  );

  return {
    subscriptionId,
    resourceGroupName,
    location,
    tenantId: process.env.LA_E2E_CLI_AZURE_TENANT_ID ?? process.env.WORKFLOWS_TENANT_ID,
    managementBaseUrl: normalizeManagementBaseUrl(
      process.env.LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL ?? process.env.WORKFLOWS_MANAGEMENT_BASE_URI ?? 'https://management.azure.com'
    ),
  };
}

function optionalEnvironmentValue(names: string[]): string | undefined {
  return names.map((name) => process.env[name]?.trim()).find((candidate) => candidate && candidate.length > 0);
}

function normalizeManagementBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function ensureLocalSettingsForMsnWeather(appDir: string, settings: MsnWeatherAzureSettings): void {
  const settingsPath = path.join(appDir, 'local.settings.json');
  const localSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  localSettings.Values = localSettings.Values ?? {};
  localSettings.Values.WORKFLOWS_SUBSCRIPTION_ID = settings.subscriptionId;
  localSettings.Values.WORKFLOWS_RESOURCE_GROUP_NAME = settings.resourceGroupName;
  localSettings.Values.WORKFLOWS_LOCATION_NAME = settings.location;
  localSettings.Values.WORKFLOWS_MANAGEMENT_BASE_URI = `${settings.managementBaseUrl}/`;
  if (settings.tenantId) {
    localSettings.Values.WORKFLOWS_TENANT_ID = settings.tenantId;
  }
  fs.writeFileSync(settingsPath, `${JSON.stringify(localSettings, null, 2)}\n`);
}

function assertMsnWeatherLocalSettingsReady(appDir: string): void {
  const settingsPath = path.join(appDir, 'local.settings.json');
  const localSettings = readJsonFile<Record<string, any>>(settingsPath);
  const values = localSettings.Values ?? {};
  const requiredKeys = ['WORKFLOWS_SUBSCRIPTION_ID', 'WORKFLOWS_RESOURCE_GROUP_NAME', 'WORKFLOWS_LOCATION_NAME'];
  const missingKeys = requiredKeys.filter((key) => !values[key]);

  assert.strictEqual(
    missingKeys.length,
    0,
    [
      `MSN Weather lifecycle expected Azure connector setup to write ${missingKeys.join(', ')} to ${settingsPath}.`,
      'Use the signed-in Azure profile opened by `pnpm --dir apps\\vs-code-designer run test:e2e-cli:open:azure`,',
      'or preseed LA_E2E_CLI_AZURE_SUBSCRIPTION_ID, LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME, and LA_E2E_CLI_AZURE_LOCATION_NAME.',
    ].join(' ')
  );
}

function assertMsnWeatherStandardWorkflow(createdWorkspace: CreatedWorkspace): void {
  const workflowJson = readJsonFile<Record<string, any>>(createdWorkspace.workflowJsonPath);
  const evidence = getSavedMsnWeatherWorkflowEvidence(createdWorkspace);
  const weatherAction = workflowJson.definition?.actions?.[evidence.weatherActionName];
  const responseAction = workflowJson.definition?.actions?.[evidence.responseActionName];

  assert.strictEqual(
    workflowJson.definition?.triggers?.[evidence.requestTriggerName]?.type,
    'Request',
    'MSN Weather workflow should use the HTTP Request trigger'
  );
  assert.strictEqual(weatherAction?.type, 'ApiConnection', 'MSN Weather workflow should include an ApiConnection weather action');
  assert.ok(
    String(weatherAction?.inputs?.host?.connection?.referenceName ?? '')
      .toLowerCase()
      .includes(msnWeatherConnectionReferenceName),
    `MSN Weather action should reference an msnweather connection. Action=${JSON.stringify(weatherAction)}`
  );
  assert.ok(
    String(weatherAction?.inputs?.path ?? '').includes(msnWeatherLocation),
    `MSN Weather path should include location ${msnWeatherLocation}. Action=${JSON.stringify(weatherAction)}`
  );
  assert.strictEqual(responseAction?.type, 'Response', 'MSN Weather workflow should include a Response action');
  assert.ok(
    String(responseAction?.inputs?.body ?? '').includes(`body('${evidence.weatherActionName}')`),
    `Response body should return the full MSN Weather body. Response=${JSON.stringify(responseAction)}`
  );
  assert.deepStrictEqual(responseAction?.runAfter, { [evidence.weatherActionName]: ['SUCCEEDED'] });
}

async function assertRunResponseReturnsMsnWeatherConditions(createdWorkspace: CreatedWorkspace, runName: string): Promise<void> {
  const evidence = getSavedMsnWeatherWorkflowEvidence(createdWorkspace);
  const weatherBody = await getActionOutputBody(
    await getRunActionDetails(createdWorkspace.wfName, runName, evidence.weatherActionName),
    evidence.weatherActionName
  );
  const responseBody = await getActionOutputBody(
    await getRunActionDetails(createdWorkspace.wfName, runName, evidence.responseActionName),
    evidence.responseActionName
  );

  assert.deepStrictEqual(responseBody, weatherBody, 'Response action should return the complete MSN Weather action body');
  assertMsnWeatherConditionsBody(responseBody);
}

function assertMsnWeatherConditionsBody(body: unknown): void {
  assert.ok(body && typeof body === 'object', `Expected MSN Weather response body to be an object. Body=${JSON.stringify(body)}`);
  const root = body as Record<string, any>;
  const current = root.responses?.weather?.current;
  const source = root.responses?.source;
  const units = root.units;

  assert.strictEqual(typeof current?.cap, 'string', 'MSN Weather response should include current condition caption');
  assert.strictEqual(typeof current?.wx, 'string', 'MSN Weather response should include METAR weather conditions');
  assert.strictEqual(typeof current?.sky, 'string', 'MSN Weather response should include METAR sky conditions');
  assert.strictEqual(typeof current?.temp, 'number', 'MSN Weather response should include temperature');
  assert.strictEqual(typeof current?.rh, 'number', 'MSN Weather response should include humidity');
  assert.strictEqual(typeof current?.windSpd, 'number', 'MSN Weather response should include wind speed');
  assert.strictEqual(typeof source?.location, 'string', 'MSN Weather response should include resolved location');
  assert.strictEqual(typeof units?.temperature, 'string', 'MSN Weather response should include temperature units');
  assert.strictEqual(typeof units?.speed, 'string', 'MSN Weather response should include speed units');
}

async function runCodefulDebugTaskLifecycle(createdWorkspace: CreatedWorkspace): Promise<void> {
  assert.strictEqual(createdWorkspace.appType, 'codeful', 'Codeful debug task lifecycle expects a codeful workspace');
  const variant = createdWorkspace.codefulControlVariant === 'legacy-control' ? 'legacy' : 'modern';
  console.log(`[workspace-lifecycle][codeful] Running ${variant} task lifecycle from ${createdWorkspace.appDir}`);

  await waitForGeneratedLogicAppFolder(createdWorkspace);
  assertCodefulControlVariant(createdWorkspace.appDir, createdWorkspace.codefulControlVariant, createdWorkspace.label);
  await waitForPathExists(
    createdWorkspace.codefulWorkflowPath ?? path.join(createdWorkspace.appDir, `${createdWorkspace.wfName}.cs`),
    45000
  );
  await waitForPathExists(getCodefulCsprojPath(createdWorkspace.appDir), 45000);

  const recorder = recordTaskEvents();
  try {
    await startDebuggingGeneratedWorkspace(createdWorkspace, { cleanupBeforeDebug: true });
    const summary = await waitForCodefulTaskSummary(recorder.events, createdWorkspace.appDir, variant, 720000);
    assertCodefulDesignTimeUsesNodeWorkerIfPresent(createdWorkspace.appDir, createdWorkspace.label);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-codeful-task-chain-observed`);
    await stopDebuggingAndTasks();
    assertCodefulTaskSummary(summary, variant, createdWorkspace.label);
  } finally {
    recorder.dispose();
  }
}

function recordTaskEvents(): TaskRecorder {
  const events: TaskEvent[] = [];
  const pushEvent = (event: TaskEvent) => {
    events.push(event);
    console.log(
      `[workspace-lifecycle][codeful][task] ${event.phase} ${event.taskName} scope=${event.scopeFsPath ?? ''} exit=${event.exitCode ?? ''}`
    );
  };
  const subscriptions = [
    vscode.tasks.onDidStartTask((event) =>
      pushEvent({
        phase: 'taskStart',
        taskName: event.execution.task.name,
        scopeFsPath: getTaskScopeFsPath(event.execution),
        processId: null,
        exitCode: null,
        timestamp: new Date().toISOString(),
      })
    ),
    vscode.tasks.onDidEndTask((event) =>
      pushEvent({
        phase: 'taskEnd',
        taskName: event.execution.task.name,
        scopeFsPath: getTaskScopeFsPath(event.execution),
        processId: null,
        exitCode: null,
        timestamp: new Date().toISOString(),
      })
    ),
    vscode.tasks.onDidStartTaskProcess((event) =>
      pushEvent({
        phase: 'processStart',
        taskName: event.execution.task.name,
        scopeFsPath: getTaskScopeFsPath(event.execution),
        processId: event.processId,
        exitCode: null,
        timestamp: new Date().toISOString(),
      })
    ),
    vscode.tasks.onDidEndTaskProcess((event) =>
      pushEvent({
        phase: 'processEnd',
        taskName: event.execution.task.name,
        scopeFsPath: getTaskScopeFsPath(event.execution),
        processId: null,
        exitCode: event.exitCode ?? null,
        timestamp: new Date().toISOString(),
      })
    ),
    vscode.debug.onDidStartDebugSession(() =>
      pushEvent({
        phase: 'debugStart',
        taskName: 'debug',
        scopeFsPath: null,
        processId: null,
        exitCode: null,
        timestamp: new Date().toISOString(),
      })
    ),
    vscode.debug.onDidTerminateDebugSession(() =>
      pushEvent({
        phase: 'debugTerminated',
        taskName: 'debug',
        scopeFsPath: null,
        processId: null,
        exitCode: null,
        timestamp: new Date().toISOString(),
      })
    ),
  ];

  return {
    events,
    dispose: () => subscriptions.forEach((subscription) => subscription.dispose()),
  };
}

function getTaskScopeFsPath(execution: vscode.TaskExecution): string | null {
  const scope = execution.task.scope;
  return scope && typeof scope === 'object' && 'uri' in scope ? scope.uri.fsPath : null;
}

async function waitForCodefulTaskSummary(
  events: TaskEvent[],
  workspaceScope: string,
  variant: 'modern' | 'legacy',
  timeoutMs: number
): Promise<CodefulTaskSummary> {
  let summary = summarizeCodefulTaskEvents(events, workspaceScope);
  await waitUntil(
    () => {
      summary = summarizeCodefulTaskEvents(events, workspaceScope);
      const buildEnded = summary.buildExit !== null;
      const publishEnded = summary.publishExit !== null;
      const funcHostStarted = summary.funcHostStartStart > 0;
      return variant === 'legacy' ? buildEnded && publishEnded && funcHostStarted : buildEnded && funcHostStarted;
    },
    timeoutMs,
    `${variant} codeful debug task chain. Summary=${JSON.stringify(summary)}`
  );
  return summarizeCodefulTaskEvents(events, workspaceScope);
}

function summarizeCodefulTaskEvents(events: TaskEvent[], workspaceScope: string): CodefulTaskSummary {
  const target = normalizeFsPath(workspaceScope);
  const scoped = events.filter((event) => normalizeFsPath(event.scopeFsPath ?? '') === target);
  const countStart = (name: string) =>
    scoped.filter((event) => event.taskName === name && (event.phase === 'processStart' || event.phase === 'taskStart')).length;
  const firstExit = (name: string): number | null => {
    const event = scoped.find((candidate) => candidate.taskName === name && candidate.phase === 'processEnd');
    return event ? event.exitCode : null;
  };

  const cleanStartProcess = scoped.filter((event) => event.taskName === 'clean' && event.phase === 'processStart').length;
  const cleanReleaseStartProcess = scoped.filter((event) => event.taskName === 'clean release' && event.phase === 'processStart').length;
  const buildStartProcess = scoped.filter((event) => event.taskName === 'build' && event.phase === 'processStart').length;
  const publishStartProcess = scoped.filter((event) => event.taskName === 'publish' && event.phase === 'processStart').length;
  const funcHostStartProcess = scoped.filter((event) => event.taskName === 'func: host start' && event.phase === 'processStart').length;

  return {
    cleanStart: cleanStartProcess || countStart('clean'),
    cleanReleaseStart: cleanReleaseStartProcess || countStart('clean release'),
    buildStart: buildStartProcess || countStart('build'),
    publishStart: publishStartProcess || countStart('publish'),
    funcHostStartStart: funcHostStartProcess || countStart('func: host start'),
    cleanExit: firstExit('clean'),
    buildExit: firstExit('build'),
    publishExit: firstExit('publish'),
    cleanReleaseExit: firstExit('clean release'),
  };
}

function assertCodefulTaskSummary(summary: CodefulTaskSummary, variant: 'modern' | 'legacy', label: string): void {
  console.log(`[workspace-lifecycle][codeful] ${label} summary: ${JSON.stringify(summary)}`);
  if (variant === 'modern') {
    assert.strictEqual(summary.publishStart, 0, `[modern] publish task must NOT start (got ${summary.publishStart})`);
    assert.strictEqual(summary.cleanReleaseStart, 0, `[modern] clean release task must NOT start (got ${summary.cleanReleaseStart})`);
    assert.strictEqual(summary.buildStart, 1, `[modern] build task must run exactly once (got ${summary.buildStart})`);
    assert.strictEqual(summary.cleanStart, 1, `[modern] clean task must run exactly once (got ${summary.cleanStart})`);
    assert.ok(summary.funcHostStartStart >= 1, `[modern] func: host start must start at least once (got ${summary.funcHostStartStart})`);
    assert.strictEqual(summary.cleanExit, 0, `[modern] clean must exit 0 (got ${summary.cleanExit})`);
    assert.strictEqual(summary.buildExit, 0, `[modern] build must exit 0 (got ${summary.buildExit})`);
    return;
  }

  assert.strictEqual(summary.publishStart, 1, `[legacy] publish task must run exactly once (got ${summary.publishStart})`);
  assert.strictEqual(summary.cleanReleaseStart, 1, `[legacy] clean release task must run exactly once (got ${summary.cleanReleaseStart})`);
  assert.strictEqual(summary.buildStart, 1, `[legacy] build task must run exactly once (got ${summary.buildStart})`);
  assert.ok(summary.funcHostStartStart >= 1, `[legacy] func: host start must start at least once (got ${summary.funcHostStartStart})`);
  assert.strictEqual(summary.cleanExit, 0, `[legacy] clean must exit 0 (got ${summary.cleanExit})`);
  assert.strictEqual(summary.buildExit, 0, `[legacy] build must exit 0 (got ${summary.buildExit})`);
  assert.strictEqual(summary.cleanReleaseExit, 0, `[legacy] clean release must exit 0 (got ${summary.cleanReleaseExit})`);
  assert.strictEqual(summary.publishExit, 0, `[legacy] publish must exit 0 (got ${summary.publishExit})`);
}

function assertCodefulDesignTimeUsesNodeWorkerIfPresent(appDir: string, label: string): void {
  const settingsPath = path.join(appDir, 'workflow-designtime', 'local.settings.json');
  if (!fs.existsSync(settingsPath)) {
    console.log(`[workspace-lifecycle][codeful] ${label}: design-time settings were not created before F5 host assertion`);
    return;
  }

  const settings = readJsonFile<{ Values?: Record<string, string> }>(settingsPath);
  const values = settings.Values ?? {};
  assert.strictEqual(
    (values.FUNCTIONS_WORKER_RUNTIME ?? '').toLowerCase(),
    'node',
    `[${label}] codeful design-time must use the Node worker`
  );
  assert.strictEqual(
    values.FUNCTIONS_INPROC_NET8_ENABLED,
    undefined,
    `[${label}] codeful design-time must not enable the in-process .NET 8 worker`
  );
}

async function assertNoForbiddenWorkbenchPrompts(stage: string): Promise<void> {
  const text = await getWorkbenchText().catch(() => '');
  for (const pattern of [
    /failed to start host/i,
    /address already in use/i,
    /failed to verify "AzureWebJobsStorage" connection/i,
    /move to a NuGet-based project/i,
    /regenerate.*\.vscode/i,
  ]) {
    assert.ok(!pattern.test(text), `[${stage}] unexpected workbench prompt or notification: ${text.slice(0, 2000)}`);
  }
}

async function waitForWorkflowReadyForOverviewRun(workflowName: string, triggerName: string): Promise<void> {
  await waitForHostRunning(300000);
  await waitForWorkflowHealthy(workflowName, 240000);
  const callbackUrl = await waitForCallbackUrl(workflowName, triggerName, 240000);
  assert.ok(callbackUrl.includes('/triggers/'), `Expected callback URL for ${workflowName}/${triggerName}. Actual: ${callbackUrl}`);
}

async function openOverviewAndClickRunTrigger(createdWorkspace: CreatedWorkspace, previousRunName: string | undefined): Promise<void> {
  console.log(`[workspace-lifecycle] Opening ${createdWorkspace.label} Overview`);
  await closeWebviewTabs(designerViewType);
  await closeWebviewTabs(overviewViewType);
  await closeAllTabs();

  const tabsBefore = getWebviewTabs(overviewViewType).length;
  await vscode.commands.executeCommand(openOverviewCommand, vscode.Uri.file(createdWorkspace.workflowJsonPath));
  const tab = await waitForWebviewTab(overviewViewType, tabsBefore, 60000);
  assert.strictEqual(getTabViewType(tab), overviewTabViewType);

  const cdp = await connectToVsCodeCdp({ targetName: `${createdWorkspace.label} overview webview` });
  try {
    let contextId = await waitForWebviewFrameContext(cdp, {
      allTextIncludes: ['Run trigger', 'Refresh'],
      description: `${createdWorkspace.label} overview webview DOM context`,
      timeoutMs: 120000,
    });
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-overview-open`);
    contextId = await clickOverviewRunTrigger(cdp, contextId, createdWorkspace);
    const newRunName = await waitForNewRunStarted(createdWorkspace.wfName, previousRunName, 60000);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-overview-run-clicked`);
    await waitForOverviewRunStatus(cdp, contextId, createdWorkspace.label, newRunName, 'Succeeded', 180000);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-overview-run-succeeded`);
  } finally {
    cdp.dispose();
  }
}

async function clickOverviewRunTrigger(cdp: CdpConnection, contextId: number, createdWorkspace: CreatedWorkspace): Promise<number> {
  let lastState = '';
  let refreshedAfterReadyProbe = false;
  let activeContextId = contextId;
  let contextRefreshCount = 0;
  await waitUntil(
    async () => {
      const result = await getOverviewButtonState(cdp, activeContextId, 'Run trigger');
      const state = JSON.stringify(result);
      if (state !== lastState) {
        lastState = state;
        console.log(`[workspace-lifecycle] ${createdWorkspace.label}: Overview Run trigger state ${state}`);
      }

      if (!result.found && !result.text && contextRefreshCount < 3) {
        activeContextId = await waitForWebviewFrameContext(cdp, {
          allTextIncludes: ['Run trigger', 'Refresh'],
          description: `${createdWorkspace.label} overview webview DOM context after reload`,
          timeoutMs: 30000,
        });
        contextRefreshCount++;
        return false;
      }

      if (result.found && !result.disabled && result.hasCallbackUrl && !result.isLoading) {
        return true;
      }

      if (!refreshedAfterReadyProbe && !result.isLoading) {
        await clickOverviewButton(cdp, activeContextId, 'Refresh').catch(() => undefined);
        refreshedAfterReadyProbe = true;
      }

      return false;
    },
    180000,
    `${createdWorkspace.label} Overview Run trigger button to become enabled with a callback URL. Last state: ${lastState}`
  );
  await clickOverviewButton(cdp, activeContextId, 'Run trigger');
  console.log(`[workspace-lifecycle] ${createdWorkspace.label}: clicked Overview Run trigger`);
  return activeContextId;
}

async function waitForOverviewRunStatus(
  cdp: CdpEvaluator,
  contextId: number,
  label: string,
  expectedRunName: string,
  targetStatus: string,
  timeoutMs: number
): Promise<void> {
  let lastStatus = '';
  let lastMatchedRun = '';
  let lastOverviewText = '';
  let lastRefreshAt = 0;
  await waitUntil(
    async () => {
      const result = await getOverviewRunStatus(cdp, contextId, expectedRunName);
      const status = result.status;
      lastOverviewText = result.text;
      if (result.identifier) {
        lastMatchedRun = result.identifier;
      }
      if (status && status !== lastStatus) {
        lastStatus = status;
        console.log(`[workspace-lifecycle] ${label}: Overview run ${expectedRunName} status "${status}"`);
      }

      if (status === targetStatus) {
        return true;
      }
      if (status === 'Failed' || status === 'Cancelled') {
        throw new Error(`${label} Overview latest run ended with status "${status}"`);
      }

      if (Date.now() - lastRefreshAt > 5000) {
        await clickOverviewButton(cdp, contextId, 'Refresh').catch(() => undefined);
        lastRefreshAt = Date.now();
      }

      return false;
    },
    timeoutMs,
    `${label} Overview run ${expectedRunName} to reach ${targetStatus}; matched run="${lastMatchedRun}", last status="${lastStatus}", overview text="${lastOverviewText.slice(
      0,
      500
    )}"`
  );
}

async function getOverviewButtonState(
  cdp: CdpEvaluator,
  contextId: number,
  ariaLabel: string
): Promise<{ found: boolean; disabled?: boolean; hasCallbackUrl?: boolean; isLoading?: boolean; text?: string }> {
  return cdp.evaluate(
    contextId,
    `(() => {
      const ariaLabel = ${JSON.stringify(ariaLabel)};
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const bodyText = document.body?.innerText || '';
      const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
        isVisible(candidate) &&
        ((candidate.getAttribute('aria-label') || '').includes(ariaLabel) || (candidate.textContent || '').includes(ariaLabel))
      );
      if (!button) {
        return { found: false, hasCallbackUrl: bodyText.includes('/triggers/') || bodyText.includes('Callback URL:'), isLoading: bodyText.includes('Loading'), text: bodyText };
      }

      return {
        found: true,
        disabled: button.disabled === true || button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true',
        hasCallbackUrl: bodyText.includes('/triggers/') || bodyText.includes('Callback URL:'),
        isLoading: bodyText.includes('Loading'),
        text: button.textContent || button.getAttribute('aria-label') || '',
      };
    })()`
  );
}

async function clickOverviewButton(
  cdp: CdpEvaluator,
  contextId: number,
  ariaLabel: string,
  options: { force?: boolean } = {}
): Promise<void> {
  const result = await cdp.evaluate<{ ok: boolean; reason?: string; point?: { x: number; y: number }; text?: string }>(
    contextId,
    `(() => {
      const ariaLabel = ${JSON.stringify(ariaLabel)};
      const force = ${JSON.stringify(options.force === true)};
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
        isVisible(candidate) &&
        ((candidate.getAttribute('aria-label') || '').includes(ariaLabel) || (candidate.textContent || '').includes(ariaLabel))
      );
      if (!button) {
        return { ok: false, reason: 'Button not found', text: document.body?.innerText || '' };
      }
      if (!force && (button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true')) {
        return { ok: false, reason: 'Button disabled', text: button.textContent || button.getAttribute('aria-label') || '' };
      }

      button.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = button.getBoundingClientRect();
      return {
        ok: true,
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        text: button.textContent || button.getAttribute('aria-label') || '',
      };
    })()`
  );

  assert.ok(
    result.ok && result.point,
    `Expected Overview button "${ariaLabel}" to be clickable. Reason=${result.reason} text=${result.text}`
  );
  await clickPoint(cdp, result.point);
}

async function getOverviewRunStatus(
  cdp: CdpEvaluator,
  contextId: number,
  expectedRunName: string
): Promise<{ identifier: string; status: string; text: string }> {
  return cdp.evaluate<{ identifier: string; status: string; text: string }>(
    contextId,
    `(() => {
      const expectedRunName = ${JSON.stringify(expectedRunName)};
      const statuses = ['Succeeded', 'Running', 'Failed', 'Cancelled', 'Waiting'];
      const rows = Array.from(document.querySelectorAll('[role="row"], .ms-DetailsRow, tr'));
      for (const row of rows) {
        const text = row.textContent || '';
        if (text.includes('Status') && text.includes('Identifier')) {
          continue;
        }

        if (!text.includes(expectedRunName)) {
          continue;
        }

        const status = statuses.find((candidate) => text.includes(candidate));
        return { identifier: expectedRunName, status: status || '', text };
      }

      const bodyText = document.body?.innerText || '';
      return { identifier: '', status: '', text: bodyText };
    })()`
  );
}

async function openRunDetailsThroughOverview(createdWorkspace: CreatedWorkspace, runName: string): Promise<void> {
  await closeWebviewTabs(monitoringViewType);
  const tabsBefore = getWebviewTabs(monitoringViewType).length;

  const overviewCdp = await connectToVsCodeCdp({ targetName: `${createdWorkspace.label} overview webview` });
  try {
    const contextId = await waitForWebviewFrameContext(overviewCdp, {
      allTextIncludes: [runName, 'Succeeded'],
      description: `${createdWorkspace.label} overview run list with ${runName}`,
      timeoutMs: 60000,
    });
    await clickOverviewRunRow(overviewCdp, contextId, runName);
  } finally {
    overviewCdp.dispose();
  }

  await waitForWebviewTab(monitoringViewType, tabsBefore, 60000);

  const { cdp: monitoringCdp, contextId } = await connectToVsCodeCdpByText({
    targetName: `${createdWorkspace.label} monitoring webview`,
    allTextIncludes: ['Get current weather', responseActionTitle],
    timeoutMs: 60000,
  });
  try {
    await waitForDesignerText(
      monitoringCdp,
      contextId,
      ['Get current weather', responseActionTitle],
      60000,
      `${createdWorkspace.label} opened monitoring run details for ${runName}`
    );
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-overview-run-details-opened`);
  } finally {
    monitoringCdp.dispose();
  }

  await openMonitoringActionResultThroughOverview(
    createdWorkspace,
    'Get current weather',
    `workspace-lifecycle-${createdWorkspace.label}-msn-weather-result-opened`
  );
  await openMonitoringActionResultThroughOverview(
    createdWorkspace,
    responseActionTitle,
    `workspace-lifecycle-${createdWorkspace.label}-response-result-opened`
  );
}

async function openMonitoringActionResultThroughOverview(
  createdWorkspace: CreatedWorkspace,
  actionTitle: string,
  screenshotName: string
): Promise<void> {
  const { cdp: monitoringCdp, contextId } = await connectToVsCodeCdpByText({
    targetName: `${createdWorkspace.label} ${actionTitle} monitoring webview`,
    allTextIncludes: [actionTitle],
    timeoutMs: 60000,
  });
  try {
    await clickMonitoringActionCardByTitle(monitoringCdp, contextId, actionTitle);
    await captureLifecycleScreenshot(`${screenshotName}-loading`);
    await waitForVisibleDelay(`${actionTitle} monitoring result loading`);
    await waitForMonitoringActionDetails(monitoringCdp, contextId, actionTitle, 180000, `${actionTitle} monitoring result details`);
    await captureLifecycleScreenshot(screenshotName);
    await waitForVisibleDelay(`${actionTitle} monitoring result details`);
  } finally {
    monitoringCdp.dispose();
  }
}

async function clickMonitoringActionCardByTitle(cdp: CdpEvaluator, contextId: number, actionTitle: string): Promise<void> {
  const result = await cdp.evaluate<{
    ok: boolean;
    reason?: string;
    text?: string;
    point?: { x: number; y: number };
    candidates?: string[];
  }>(
    contextId,
    `(() => {
      const actionTitle = ${JSON.stringify(actionTitle.toLowerCase())};
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const allElements = [];
      const collectElements = (root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node = walker.currentNode;
        while (node) {
          if (node instanceof HTMLElement) {
            allElements.push(node);
            if (node.shadowRoot) {
              collectElements(node.shadowRoot);
            }
          }
          node = walker.nextNode();
        }
      };
      collectElements(document);

      const candidates = allElements
        .filter(isVisible)
        .filter((element) => {
          const text = normalize(element.textContent).toLowerCase();
          const aria = normalize(element.getAttribute('aria-label')).toLowerCase();
          return text === actionTitle || aria === actionTitle || text.includes(actionTitle) || aria.includes(actionTitle);
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { element, rect, text: normalize(element.textContent || element.getAttribute('aria-label') || '') };
        })
        .filter(({ rect }) => rect.width > 80 && rect.height > 20)
        .sort((a, b) => {
          const aArea = a.rect.width * a.rect.height;
          const bArea = b.rect.width * b.rect.height;
          return aArea - bArea;
        });

      const element = candidates[0]?.element;
      const debugCandidates = candidates.slice(0, 20).map(({ rect, text }) => text.slice(0, 120) + ' | ' + Math.round(rect.left) + ',' + Math.round(rect.top) + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
      if (!(element instanceof HTMLElement)) {
        return { ok: false, reason: 'Monitoring action card not found', candidates: debugCandidates, text: document.body?.innerText || '' };
      }

      element.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = element.getBoundingClientRect();
      return {
        ok: true,
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        text: normalize(element.textContent || element.getAttribute('aria-label') || ''),
      };
    })()`
  );

  assert.ok(
    result.ok && result.point,
    `Expected monitoring action card "${actionTitle}". Reason=${result.reason} candidates=${JSON.stringify(result.candidates)} text=${String(
      result.text
    ).slice(0, 1000)}`
  );

  console.log(`[workspace-lifecycle] Opening monitoring action result "${actionTitle}" (${result.text ?? ''})`);
  await clickPoint(cdp, result.point);
}

async function waitForMonitoringActionDetails(
  cdp: CdpEvaluator,
  contextId: number,
  actionTitle: string,
  timeoutMs: number,
  description: string
): Promise<void> {
  const normalizedTitle = actionTitle.toLowerCase();
  let lastText = '';
  await waitUntil(
    async () => {
      const result = await cdp.evaluate<{ ok: boolean; text: string }>(
        contextId,
        `(() => {
          const actionTitle = ${JSON.stringify(normalizedTitle)};
          const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
          const text = normalize(document.body?.innerText || '');
          const isLoadingInputsOutputs = text.includes('loading inputs') || text.includes('loading outputs') || text.includes('loading inputs and outputs');
          const hasAction = text.includes(actionTitle);
          const hasResultEvidence =
            text.includes('inputs') ||
            text.includes('outputs') ||
            text.includes('raw inputs') ||
            text.includes('raw outputs') ||
            text.includes('duration') ||
            text.includes('status');
          return { ok: hasAction && hasResultEvidence && !isLoadingInputsOutputs, text };
        })()`
      );
      lastText = result.text.slice(0, 1500);
      return result.ok;
    },
    timeoutMs,
    `${description}. Last text: ${lastText}`
  );
}

async function clickOverviewRunRow(cdp: CdpEvaluator, contextId: number, runName: string): Promise<void> {
  const result = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string }>(
    contextId,
    `(() => {
      const runName = ${JSON.stringify(runName)};
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const rows = Array.from(document.querySelectorAll('[role="row"], .ms-DetailsRow, tr')).filter(isVisible);
      const row = rows.find((candidate) => {
        const text = candidate.textContent || '';
        return text.includes(runName) && text.includes('Succeeded');
      });
      if (!(row instanceof HTMLElement)) {
        return { ok: false, reason: 'Run row not found', text: document.body?.innerText || '' };
      }

      row.scrollIntoView({ block: 'center', inline: 'center' });
      const target = row.querySelector('button, a, [role="button"], [role="link"], [data-is-focusable="true"]');
      if (target instanceof HTMLElement) {
        target.click();
        return { ok: true, text: target.textContent || row.textContent || '' };
      }

      row.click();
      return { ok: true, text: row.textContent || '' };
    })()`
  );
  assert.ok(result.ok, `Expected Overview run row ${runName} to open details. Reason=${result.reason} text=${result.text?.slice(0, 1000)}`);
}

async function waitForHostRunning(timeoutMs: number): Promise<void> {
  await waitUntil(() => isHostRunning(), timeoutMs, 'Functions host to report state=Running');
}

async function isHostRunning(): Promise<boolean> {
  const status = await httpRequest({ url: 'http://localhost:7071/admin/host/status', method: 'GET' }, 5000).catch(() => undefined);
  if (status?.status !== 200) {
    return false;
  }

  try {
    const body = JSON.parse(status.body);
    return String(body?.state ?? '').toLowerCase() === 'running';
  } catch {
    return false;
  }
}

async function waitForWorkflowHealthy(workflowName: string, timeoutMs: number): Promise<void> {
  await waitUntil(
    async () => {
      const workflows = await httpRequest({ url: `${managementBaseUrl}/workflows?api-version=${apiVersion}`, method: 'GET' }, 5000).catch(
        () => undefined
      );
      if (workflows?.status !== 200) {
        return false;
      }

      const workflow = parseListResponse(workflows.body).find((item) => item?.name === workflowName);
      const healthState = workflow?.properties?.health?.state ?? workflow?.health?.state;
      return String(healthState ?? '').toLowerCase() === 'healthy';
    },
    timeoutMs,
    `workflow ${workflowName} to be Healthy`
  );
}

async function waitForCallbackUrl(workflowName: string, triggerName: string, timeoutMs: number): Promise<string> {
  let lastBody = '';
  await waitUntil(
    async () => {
      const response = await httpRequest(
        {
          url: `${managementBaseUrl}/workflows/${encodeURIComponent(workflowName)}/triggers/${encodeURIComponent(
            triggerName
          )}/listCallbackUrl?api-version=${apiVersion}`,
          method: 'POST',
        },
        5000
      ).catch(() => undefined);
      lastBody = response?.body ?? '';
      if (response?.status !== 200) {
        return false;
      }

      try {
        const parsed = JSON.parse(response.body);
        return typeof parsed?.value === 'string' && parsed.value.length > 0;
      } catch {
        return false;
      }
    },
    timeoutMs,
    `callback URL for workflow ${workflowName}. Last body: ${lastBody.slice(0, 500)}`
  );

  const response = await httpRequest({
    url: `${managementBaseUrl}/workflows/${encodeURIComponent(workflowName)}/triggers/${encodeURIComponent(
      triggerName
    )}/listCallbackUrl?api-version=${apiVersion}`,
    method: 'POST',
  });
  const parsed = JSON.parse(response.body);
  return parsed.value;
}

async function getLatestRunName(workflowName: string): Promise<string | undefined> {
  const runs = await httpRequest(
    { url: `${managementBaseUrl}/workflows/${encodeURIComponent(workflowName)}/runs?api-version=${apiVersion}`, method: 'GET' },
    5000
  ).catch(() => undefined);
  if (runs?.status !== 200) {
    return undefined;
  }

  const latestRun = parseListResponse(runs.body)[0];
  return typeof latestRun?.name === 'string' ? latestRun.name : undefined;
}

async function waitForNewRunStarted(workflowName: string, previousRunName: string | undefined, timeoutMs: number): Promise<string> {
  let latestRunName = '';
  await waitUntil(
    async () => {
      latestRunName = (await getLatestRunName(workflowName)) ?? '';
      return !!latestRunName && latestRunName !== previousRunName;
    },
    timeoutMs,
    `new run for workflow ${workflowName}; previous run=${previousRunName ?? '(none)'}, latest run=${latestRunName || '(none)'}`
  );

  return latestRunName;
}

async function waitForLatestRunStatus(
  workflowName: string,
  targetStatus: string,
  timeoutMs: number,
  excludedRunName?: string
): Promise<{ name: string; status: string }> {
  let lastStatus = '';
  let lastBody = '';
  await waitUntil(
    async () => {
      const runs = await httpRequest(
        { url: `${managementBaseUrl}/workflows/${encodeURIComponent(workflowName)}/runs?api-version=${apiVersion}`, method: 'GET' },
        5000
      ).catch(() => undefined);
      lastBody = runs?.body ?? '';
      if (runs?.status !== 200) {
        return false;
      }

      const latestRun = parseListResponse(runs.body)[0];
      if (!latestRun || latestRun.name === excludedRunName) {
        return false;
      }
      const status = latestRun?.properties?.status ?? latestRun?.status;
      if (typeof status === 'string') {
        lastStatus = status;
      }
      if (status === 'Failed' || status === 'Cancelled') {
        throw new Error(`Workflow ${workflowName} run ended with ${status}. Body: ${runs.body.slice(0, 1000)}`);
      }
      return status === targetStatus && typeof latestRun?.name === 'string';
    },
    timeoutMs,
    `workflow ${workflowName} latest run to reach ${targetStatus}. Last status: ${lastStatus}. Last body: ${lastBody.slice(0, 500)}`
  );

  const runs = await httpRequest({
    url: `${managementBaseUrl}/workflows/${encodeURIComponent(workflowName)}/runs?api-version=${apiVersion}`,
    method: 'GET',
  });
  const latestRun = parseListResponse(runs.body)[0];
  assert.notStrictEqual(
    latestRun.name,
    excludedRunName,
    `Expected latest run for ${workflowName} to be new after Overview Run trigger click`
  );
  return {
    name: latestRun.name,
    status: latestRun.properties?.status ?? latestRun.status,
  };
}

async function getLatestRunActionStatuses(workflowName: string, runName: string): Promise<Array<{ name: string; status: string }>> {
  const actions = await httpRequest({
    url: `${managementBaseUrl}/workflows/${encodeURIComponent(workflowName)}/runs/${encodeURIComponent(runName)}/actions?api-version=${apiVersion}`,
    method: 'GET',
  });
  assert.strictEqual(actions.status, 200, `Expected actions endpoint to return 200. Body: ${actions.body.slice(0, 1000)}`);

  return parseListResponse(actions.body).map((action) => ({
    name: action?.name,
    status: action?.properties?.status ?? action?.status,
  }));
}

async function getRunActionDetails(workflowName: string, runName: string, actionName: string): Promise<Record<string, any>> {
  const action = await httpRequest({
    url: `${managementBaseUrl}/workflows/${encodeURIComponent(workflowName)}/runs/${encodeURIComponent(runName)}/actions/${encodeURIComponent(
      actionName
    )}?api-version=${apiVersion}`,
    method: 'GET',
  });
  assert.strictEqual(
    action.status,
    200,
    `Expected action details endpoint for ${workflowName}/${runName}/${actionName} to return 200. Body: ${action.body.slice(0, 1000)}`
  );
  return JSON.parse(action.body);
}

async function getActionOutputBody(actionDetails: Record<string, any>, actionName: string): Promise<unknown> {
  let outputs = actionDetails.properties?.outputs ?? actionDetails.outputs;
  if (!outputs) {
    const outputsLinkUri = actionDetails.properties?.outputsLink?.uri ?? actionDetails.outputsLink?.uri;
    assert.strictEqual(
      typeof outputsLinkUri,
      'string',
      `Expected action ${actionName} to include inline outputs or outputsLink. Details=${JSON.stringify(actionDetails)}`
    );
    const linkedOutputs = await httpRequest({ url: outputsLinkUri, method: 'GET' });
    assert.strictEqual(
      linkedOutputs.status,
      200,
      `Expected action ${actionName} outputsLink to return 200. Body=${linkedOutputs.body.slice(0, 1000)}`
    );
    outputs = parseMaybeJsonString(linkedOutputs.body);
  }

  assert.ok(
    outputs && typeof outputs === 'object',
    `Expected action ${actionName} to include outputs. Details=${JSON.stringify(actionDetails)}`
  );
  const body = outputs.body ?? outputs.Body;
  assert.notStrictEqual(body, undefined, `Expected action ${actionName} outputs to include body. Outputs=${JSON.stringify(outputs)}`);
  return parseMaybeJsonString(body);
}

function parseMaybeJsonString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseListResponse(body: string): any[] {
  const parsed = JSON.parse(body);
  return Array.isArray(parsed?.value) ? parsed.value : Array.isArray(parsed) ? parsed : [];
}

function httpRequest(options: { url: string; method: string; body?: string }, timeoutMs = 15000): Promise<HttpResult> {
  return new Promise((resolve) => {
    const url = new URL(options.url);
    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: options.method,
        timeout: timeoutMs,
        headers: options.body
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(options.body),
            }
          : undefined,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf-8') });
        });
      }
    );

    request.on('error', (error) => resolve({ status: 0, body: String(error) }));
    request.on('timeout', () => {
      request.destroy();
      resolve({ status: 0, body: `Timed out after ${timeoutMs}ms` });
    });
    if (options.body) {
      request.write(options.body);
    }
    request.end();
  });
}

async function stopDebuggingAndTasks(): Promise<void> {
  if (vscode.debug.activeDebugSession) {
    await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
    await waitUntil(() => !vscode.debug.activeDebugSession, 10000, 'active debug session to stop');
  }
  for (const execution of vscode.tasks.taskExecutions) {
    execution.terminate();
  }
  await waitUntil(() => vscode.tasks.taskExecutions.length === 0, 10000, 'VS Code task executions to terminate');
}

async function stopDebuggingOnly(): Promise<void> {
  if (!vscode.debug.activeDebugSession) {
    return;
  }

  await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
  await waitUntil(() => !vscode.debug.activeDebugSession, 10000, 'active debug session to stop');
}

async function logAzuriteDiagnostics(stage: string, appDir: string): Promise<void> {
  const logicAppsConfig = vscode.workspace.getConfiguration('azureLogicAppsStandard', vscode.Uri.file(appDir));
  const azuriteConfig = vscode.workspace.getConfiguration('azurite', vscode.Uri.file(appDir));
  const azuriteExtension = vscode.extensions.getExtension('Azurite.azurite') ?? vscode.extensions.getExtension('azurite.azurite');
  const portResults = await Promise.all(
    [
      { name: 'blob', url: 'http://127.0.0.1:10000/devstoreaccount1?comp=list' },
      { name: 'queue', url: 'http://127.0.0.1:10001/devstoreaccount1?comp=list' },
      { name: 'table', url: 'http://127.0.0.1:10002/Tables' },
    ].map(async (probe) => ({
      name: probe.name,
      ...(await httpRequest({ url: probe.url, method: 'GET' }, 2000)),
    }))
  );

  console.log(
    `[workspace-lifecycle][azurite-diagnostics][${stage}] settings=${JSON.stringify({
      autoStartAzurite: logicAppsConfig.get('autoStartAzurite'),
      logicAppsAzuriteLocation: logicAppsConfig.get('azuriteLocationSetting'),
      azuriteLocation: azuriteConfig.get('location'),
    })}`
  );
  console.log(
    `[workspace-lifecycle][azurite-diagnostics][${stage}] extension=${JSON.stringify({
      id: azuriteExtension?.id,
      version: azuriteExtension?.packageJSON?.version,
      isActive: azuriteExtension?.isActive,
      extensionPath: azuriteExtension?.extensionPath,
    })}`
  );
  console.log(
    `[workspace-lifecycle][azurite-diagnostics][${stage}] tasks=${JSON.stringify(
      vscode.tasks.taskExecutions.map((execution) => execution.task.name)
    )}`
  );
  console.log(`[workspace-lifecycle][azurite-diagnostics][${stage}] ports=${JSON.stringify(portResults)}`);

  const statusBarText = await getWorkbenchText().catch((error) => `Unable to read workbench text: ${String(error)}`);
  const azuriteStatusLines = statusBarText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().includes('azurite'));
  console.log(`[workspace-lifecycle][azurite-diagnostics][${stage}] statusBar=${JSON.stringify(azuriteStatusLines.slice(-12))}`);

  for (const log of findRelevantVsCodeLogFiles().slice(-8)) {
    console.log(`[workspace-lifecycle][azurite-diagnostics][${stage}] logTail ${log}:\n${tailFile(log, 2500)}`);
  }
}

async function getWorkbenchText(): Promise<string> {
  const cdp = await connectToVsCodeWorkbenchCdp();
  try {
    return await cdp.evaluate<string>(undefined, 'document.body?.innerText || ""');
  } finally {
    cdp.dispose();
  }
}

function findRelevantVsCodeLogFiles(): string[] {
  const userDataDir = process.env.LA_E2E_CLI_USER_DATA_DIR;
  if (!userDataDir || !fs.existsSync(userDataDir)) {
    return [];
  }

  const logsDir = path.join(userDataDir, 'logs');
  if (!fs.existsSync(logsDir)) {
    return [];
  }

  return walkFiles(logsDir)
    .filter((filePath) => {
      const lowerPath = filePath.toLowerCase();
      return lowerPath.includes('azurite') || lowerPath.includes('azure logic apps') || lowerPath.includes('output_logging');
    })
    .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
}

function walkFiles(directory: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(entryPath));
    } else {
      result.push(entryPath);
    }
  }
  return result;
}

function tailFile(filePath: string, maxChars: number): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.slice(-maxChars);
  } catch (error) {
    return `Unable to read ${filePath}: ${String(error)}`;
  }
}

async function killPortsBound(ports: number[]): Promise<void> {
  for (const port of ports) {
    await killPortBound(port);
  }
}

async function killPortBound(port: number): Promise<void> {
  try {
    if (process.platform === 'win32') {
      let pidsRaw = '';
      try {
        pidsRaw = execSync(
          `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique"`,
          { stdio: 'pipe', timeout: 5000 }
        ).toString();
      } catch {
        pidsRaw = '';
      }

      const pids = pidsRaw
        .split(/\s+/)
        .map((pid) => pid.trim())
        .filter((pid) => /^\d+$/.test(pid));
      for (const pid of pids) {
        execSync(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`, {
          stdio: 'pipe',
          timeout: 5000,
        });
        console.log(`[workspace-lifecycle] Killed PID ${pid} listening on :${port}`);
      }
      return;
    }

    let pidsRaw = '';
    try {
      pidsRaw = execSync(`lsof -ti:${port}`, { stdio: 'pipe', timeout: 5000, shell: '/bin/sh' }).toString();
    } catch {
      pidsRaw = '';
    }
    const pids = pidsRaw
      .split(/\s+/)
      .map((pid) => pid.trim())
      .filter((pid) => /^\d+$/.test(pid));
    for (const pid of pids) {
      execSync(`kill -9 ${pid}`, { stdio: 'pipe', timeout: 5000, shell: '/bin/sh' });
      console.log(`[workspace-lifecycle] Killed PID ${pid} listening on :${port}`);
    }
  } catch (error) {
    console.log(`[workspace-lifecycle] Non-fatal port cleanup failure for :${port}: ${String(error)}`);
  }
}

async function clickWizardButton(cdp: CdpEvaluator, contextId: number, buttonText: string): Promise<void> {
  const clickResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; point?: { x: number; y: number } }>(
    contextId,
    `(() => {
      const expected = ${JSON.stringify(buttonText)};
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const button = Array.from(document.querySelectorAll('button'))
        .filter(isVisible)
        .find((candidate) => (candidate.textContent || '').includes(expected));
      if (!(button instanceof HTMLButtonElement)) {
        return { ok: false, reason: 'Button not found', text: document.body?.innerText || '' };
      }
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') {
        return { ok: false, reason: 'Button is disabled', text: document.body?.innerText || '' };
      }
      button.scrollIntoView({ block: 'center', inline: 'center' });
      button.focus();
      const rect = button.getBoundingClientRect();
      return { ok: true, text: document.body?.innerText || '', point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
    })()`
  );

  assert.strictEqual(clickResult.ok, true, clickResult.reason ?? `Failed to click "${buttonText}" button. Text: ${clickResult.text ?? ''}`);
  assert.ok(clickResult.point, `Failed to locate "${buttonText}" button click point.`);
  await clickPoint(cdp, clickResult.point);
}

async function waitForReviewStep(cdp: CdpEvaluator, contextId: number, creationCase: WorkspaceCreationCase): Promise<void> {
  const expectedValues = [
    creationCase.wsName,
    creationCase.appName,
    creationCase.wfName,
    creationCase.functionFolderName,
    creationCase.functionNamespace,
    creationCase.functionName,
  ].filter((value): value is string => !!value);
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    const pageText = await getPageText(cdp, contextId);
    const onReviewStep = containsIgnoreCase(pageText, 'Review') && containsIgnoreCase(pageText, 'Create workspace');
    const valuesPresent = expectedValues.every((value) => pageText.includes(value));
    if (onReviewStep && valuesPresent) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const pageText = await getPageText(cdp, contextId);
  assert.fail(`Timed out waiting for ${creationCase.label} review step. Text: ${pageText}`);
}

async function waitForCreatedWorkspaceMaterialization(parentPath: string, creationCase: WorkspaceCreationCase): Promise<void> {
  const workspaceDir = path.join(parentPath, creationCase.wsName);
  const workspaceFilePath = path.join(workspaceDir, `${creationCase.wsName}.code-workspace`);
  const appDir = path.join(workspaceDir, creationCase.appName);
  const workflowJsonPath = path.join(appDir, creationCase.wfName, 'workflow.json');
  const functionFolderName = creationCase.functionFolderName;

  await waitUntil(
    () => {
      if (!fs.existsSync(workspaceFilePath) || !fs.existsSync(appDir)) {
        return false;
      }

      if (creationCase.appType === 'codeful') {
        return (
          fs.existsSync(path.join(appDir, `${creationCase.wfName}.cs`)) &&
          fs.existsSync(path.join(appDir, `${creationCase.appName}.csproj`)) &&
          fs.existsSync(path.join(appDir, 'Program.cs'))
        );
      }

      if (!fs.existsSync(workflowJsonPath)) {
        return false;
      }

      if (creationCase.appType === 'standard') {
        return true;
      }

      if (!functionFolderName) {
        return false;
      }

      const functionDir = path.join(workspaceDir, functionFolderName);
      return fs.existsSync(functionDir) && hasCsproj(functionDir);
    },
    60000,
    `generated workspace files for ${creationCase.label} under ${workspaceDir}`
  );
}

function verifyCreatedWorkspace(parentPath: string, creationCase: WorkspaceCreationCase): CreatedWorkspace {
  const workspaceDir = path.join(parentPath, creationCase.wsName);
  const workspaceFilePath = path.join(workspaceDir, `${creationCase.wsName}.code-workspace`);
  const appDir = path.join(workspaceDir, creationCase.appName);
  const workflowJsonPath = path.join(appDir, creationCase.wfName, 'workflow.json');
  const codefulWorkflowPath = path.join(appDir, `${creationCase.wfName}.cs`);

  assert.ok(fs.existsSync(workspaceDir), `Workspace directory should exist: ${workspaceDir}`);
  assert.ok(fs.existsSync(workspaceFilePath), `.code-workspace file should exist: ${workspaceFilePath}`);
  assert.ok(fs.existsSync(appDir), `Logic app directory should exist: ${appDir}`);

  const workspaceContent = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf-8')) as { folders?: Array<{ name?: string; path?: string }> };
  const folderPaths = (workspaceContent.folders ?? []).map((folder) => path.resolve(workspaceDir, folder.path ?? folder.name ?? ''));
  assert.ok(
    folderPaths.some((folderPath) => normalizeFsPath(folderPath) === normalizeFsPath(appDir)),
    'Generated workspace should include the logic app folder'
  );

  if (creationCase.appType === 'codeful') {
    assert.ok(fs.existsSync(codefulWorkflowPath), `Codeful workflow source should exist: ${codefulWorkflowPath}`);
    assert.ok(fs.existsSync(getCodefulCsprojPath(appDir)), `Codeful .csproj should exist under ${appDir}`);
    assert.ok(fs.existsSync(path.join(appDir, 'Program.cs')), `Codeful Program.cs should exist under ${appDir}`);
  } else {
    assert.ok(fs.existsSync(workflowJsonPath), `workflow.json should exist: ${workflowJsonPath}`);
  }

  if (creationCase.appType === 'customCode' || creationCase.appType === 'rulesEngine') {
    const functionFolderName = requiredValue(creationCase.functionFolderName);
    const functionDir = path.join(workspaceDir, functionFolderName);
    assert.ok(
      folderPaths.some((folderPath) => path.basename(folderPath) === functionFolderName),
      `Generated ${creationCase.label} workspace should include function folder ${functionFolderName}`
    );
    assert.ok(fs.existsSync(functionDir), `Generated ${creationCase.label} function folder should exist: ${functionDir}`);
    assert.ok(hasCsproj(functionDir), `Generated ${creationCase.label} function folder should include a .csproj: ${functionDir}`);
  }

  return {
    label: creationCase.label,
    appType: creationCase.appType,
    wsName: creationCase.wsName,
    appName: creationCase.appName,
    wfName: creationCase.wfName,
    functionFolderName: creationCase.functionFolderName,
    functionNamespace: creationCase.functionNamespace,
    functionName: creationCase.functionName,
    workspaceDir,
    workspaceFilePath,
    appDir,
    workflowJsonPath,
    codefulWorkflowPath: creationCase.appType === 'codeful' ? codefulWorkflowPath : undefined,
    folderPaths,
    codefulControlVariant: creationCase.codefulControlVariant,
  };
}

async function handleDesignerQuickPickPrompts(timeoutMs = 20000, options: { useAzureConnectors?: boolean } = {}): Promise<void> {
  await handleWorkbenchPrompts(
    [
      {
        matchText: 'Enable connectors in Azure',
        optionText: options.useAzureConnectors ? 'Use connectors from Azure' : 'Skip for now',
      },
      { matchText: 'Connection Keys', optionText: 'Connection Keys' },
    ],
    timeoutMs
  );
}

async function handleWorkbenchPrompts(prompts: Array<{ matchText: string; optionText: string }>, timeoutMs = 20000): Promise<void> {
  const cdp = await connectToVsCodeWorkbenchCdp();
  try {
    const deadline = Date.now() + timeoutMs;
    const noPromptDeadline = Date.now() + 1500;
    let handledPrompt = false;
    while (Date.now() < deadline) {
      const result = await cdp.evaluate<{
        visible: boolean;
        text: string;
        targetText?: string;
        point?: { x: number; y: number };
      }>(
        undefined,
        `(() => {
          const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
          const prompts = ${JSON.stringify(prompts)};
          const promptContainers = Array.from(document.querySelectorAll(
            '.quick-input-widget, .monaco-dialog-box, [role="dialog"], .notification-toast, .notification-list-item'
          )).filter(isVisible);

          for (const container of promptContainers) {
            if (!(container instanceof HTMLElement)) {
              continue;
            }

            const inputText = Array.from(container.querySelectorAll('input'))
              .map((input) => (input.value || '') + ' ' + (input.getAttribute('placeholder') || ''))
              .join(' ');
            const containerText = ((container.innerText || container.textContent || '') + ' ' + inputText).replace(/\\s+/g, ' ').trim();

            const rows = Array.from(container.querySelectorAll('.monaco-list-row, [role="option"]')).filter(isVisible);
            const rowData = rows.map((row) => ({
              element: row,
              text: (row.textContent || '').replace(/\\s+/g, ' ').trim(),
            }));
            const prompt = prompts.find((candidate) => {
              const lowerContainerText = containerText.toLowerCase();
              const lowerMatchText = candidate.matchText.toLowerCase();
              const lowerOptionText = candidate.optionText.toLowerCase();
              return lowerContainerText.includes(lowerMatchText) || rowData.some((entry) => entry.text.toLowerCase().includes(lowerOptionText));
            });
            if (!prompt) {
              continue;
            }

            const buttons = Array.from(container.querySelectorAll('a.monaco-button, button, .monaco-text-button')).filter(isVisible);
            const buttonData = buttons.map((button) => ({
              element: button,
              text: (button.textContent || '').replace(/\\s+/g, ' ').trim(),
            }));
            const lowerOptionText = prompt.optionText.toLowerCase();
            const targetButton =
              buttonData.find((entry) => entry.text.toLowerCase() === lowerOptionText) ||
              buttonData.find((entry) => entry.text.toLowerCase().includes(lowerOptionText) && entry.text.length < containerText.length);
            if (targetButton) {
              targetButton.element.scrollIntoView({ block: 'center', inline: 'center' });
              const rect = targetButton.element.getBoundingClientRect();
              return {
                visible: true,
                text: containerText,
                targetText: targetButton.text,
                point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
              };
            }

            const targetRow = rowData.find((entry) => entry.text.toLowerCase().includes(prompt.optionText.toLowerCase()));
            if (targetRow) {
              targetRow.element.scrollIntoView({ block: 'center', inline: 'center' });
              const rect = targetRow.element.getBoundingClientRect();
              return {
                visible: true,
                text: containerText,
                targetText: targetRow.text,
                point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
              };
            }

            return { visible: true, text: containerText };
          }

          return { visible: false, text: document.body?.innerText || '' };
        })()`
      );

      if (result.point) {
        console.log(`[workspace-lifecycle] Selecting workbench prompt option "${result.targetText}"`);
        await clickPoint(cdp, result.point);
        handledPrompt = true;
        await waitForWorkbenchPromptOptionToDismiss(cdp, result.targetText ?? '', 5000).catch(() => undefined);
        continue;
      }

      if (!result.visible && (handledPrompt || Date.now() > noPromptDeadline)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    cdp.dispose();
  }
}

async function dismissWorkbenchNotifications(): Promise<void> {
  const cdp = await connectToVsCodeWorkbenchCdp();
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const point = await cdp.evaluate<{ x: number; y: number } | undefined>(
        undefined,
        `(() => {
          const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
          const notifications = Array.from(document.querySelectorAll('.notification-toast, .notification-list-item')).filter(isVisible);
          for (const notification of notifications) {
            const buttons = Array.from(notification.querySelectorAll('button, .monaco-button, .monaco-text-button')).filter(isVisible);
            const button = buttons.find((candidate) => {
              const text = (candidate.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
              return text === 'don\\'t show again' || text === 'close';
            });
            const target = button || notification.querySelector('.codicon-close, [aria-label*="Close"], [title*="Close"]');
            if (target instanceof HTMLElement && isVisible(target)) {
              target.scrollIntoView({ block: 'center', inline: 'center' });
              const rect = target.getBoundingClientRect();
              return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
          }
          return undefined;
        })()`
      );

      if (!point) {
        return;
      }

      await clickPoint(cdp, point);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    cdp.dispose();
  }
}

async function waitForWorkbenchPromptOptionToDismiss(cdp: CdpEvaluator, optionText: string, timeoutMs: number): Promise<void> {
  if (!optionText) {
    return;
  }

  await waitUntil(
    () =>
      cdp.evaluate<boolean>(
        undefined,
        `(() => {
          const optionText = ${JSON.stringify(optionText.toLowerCase())};
          const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
          const promptContainers = Array.from(document.querySelectorAll(
            '.quick-input-widget, .monaco-dialog-box, [role="dialog"], .notification-toast, .notification-list-item'
          )).filter(isVisible);
          return !promptContainers.some((container) => (container.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase().includes(optionText));
        })()`
      ),
    timeoutMs,
    `workbench prompt option "${optionText}" to dismiss`
  );
}

async function captureLifecycleScreenshot(name: string): Promise<void> {
  const cdp = await connectToVsCodeWorkbenchCdp();
  try {
    await captureCdpScreenshot(cdp, name);
  } finally {
    cdp.dispose();
  }
}

async function waitUntil(predicate: () => boolean | Promise<boolean>, timeoutMs: number, description: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  assert.fail(`Timed out waiting for ${description}${lastError ? `. Last error: ${String(lastError)}` : ''}`);
}

async function withTimeout<T>(promise: Thenable<T>, timeoutMs: number, description: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${description}`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
