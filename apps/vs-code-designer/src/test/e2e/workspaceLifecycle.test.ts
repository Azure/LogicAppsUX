import * as assert from 'assert';
import { execFileSync, execSync } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  connectToVsCodeCdp,
  connectToVsCodeWorkbenchCdp,
  waitForCreateWorkspaceFrameContext,
  waitForWebviewFrameContext,
} from './cdpClient';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { captureCdpScreenshot } from './screenshot';
import { waitForVisibleDelay } from './visibleDelay';

const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const createWorkspaceCommand = 'azureLogicAppsStandard.createWorkspace';
const openDesignerCommand = 'azureLogicAppsStandard.openDesigner';
const openOverviewCommand = 'azureLogicAppsStandard.openOverview';
const createWorkspaceViewType = 'CreateWorkspace';
const createWorkspaceTabViewType = `mainThreadWebview-${createWorkspaceViewType}`;
const createWorkspaceTitle = 'Create workspace';
const designerViewType = 'designerLocal';
const designerTabViewType = `mainThreadWebview-${designerViewType}`;
const overviewViewType = 'workflowOverview';
const overviewTabViewType = `mainThreadWebview-${overviewViewType}`;
const managementBaseUrl = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
const apiVersion = '2019-10-01-edge-preview';
const requestTriggerTitle = 'When a HTTP request is received';
const responseActionTitle = 'Response';
const azuritePorts = [10000, 10001, 10002];

type CdpEvaluator = {
  evaluate<T>(contextId: number | undefined, expression: string): Promise<T>;
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
};
type FieldLabels = string | string[];
type WorkspaceAppType = 'standard' | 'customCode' | 'rulesEngine';

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
  folderPaths: string[];
}

interface HttpResult {
  status: number;
  body: string;
}

interface SavedWorkflowOperations {
  requestTriggerName: string;
  responseActionName: string;
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
    if (lifecycleMode === 'create') {
      return;
    }

    try {
      fs.rmSync(tempWorkspaceParentPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`[workspace-lifecycle] Unable to remove temp workspace parent ${tempWorkspaceParentPath}: ${String(error)}`);
    }
  });

  test('Should open generated designers and run saved workflows for Standard, custom code, and rules engine projects', async function () {
    this.timeout(1_200_000);

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

function getWorkspaceLifecycleCaseFromEnv(): CreatedWorkspace {
  const rawCase = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE;
  assert.ok(rawCase, 'LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE must be set in run mode');
  return JSON.parse(rawCase) as CreatedWorkspace;
}

async function createWorkspaceThroughWebview(creationCase: WorkspaceCreationCase, parentPath: string): Promise<CreatedWorkspace> {
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
  } finally {
    cdp.dispose();
    await closeWebviewTabs(createWorkspaceViewType);
  }
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

  assert.ok(
    await isDropdownValueSelected(cdp, contextId, 'Workflow type', 'Stateful'),
    `Expected ${creationCase.label} Workflow type dropdown to be Stateful`
  );
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

async function openDesignerAndCreateWorkflow(createdWorkspace: CreatedWorkspace): Promise<void> {
  await closeAllTabs();
  const workflowDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(createdWorkspace.workflowJsonPath));
  await vscode.window.showTextDocument(workflowDocument, { preview: false });
  const tabsBefore = getWebviewTabs(designerViewType).length;

  const openDesignerPromise = vscode.commands
    .executeCommand(openDesignerCommand)
    .then(undefined, (error) => console.warn(`[workspace-lifecycle] openDesigner command rejected: ${String(error)}`));
  assert.ok(openDesignerPromise, 'Expected open designer command to start');

  await handleDesignerQuickPickPrompts(15000);

  const tab = await waitForWebviewTab(designerViewType, tabsBefore, 360000);
  assert.strictEqual(getTabViewType(tab), designerTabViewType);
  assert.ok(
    tab.label.includes(createdWorkspace.wfName),
    `Expected designer tab label to include workflow name "${createdWorkspace.wfName}". Open tabs: ${describeOpenTabs()}`
  );

  await handleDesignerQuickPickPrompts(15000);

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
      await addResponseActionThroughDesigner(cdp, contextId, createdWorkspace.label);
    } else {
      console.log(`[workspace-lifecycle] ${createdWorkspace.label}: designer opened with generated workflow content`);
      if (!initialCanvasText.includes(responseActionTitle)) {
        await addResponseActionThroughDesigner(cdp, contextId, createdWorkspace.label);
      }
    }
    await saveWorkflowThroughDesigner(cdp, contextId, createdWorkspace.label);

    const canvasText = await getDesignerText(cdp, contextId);
    assert.ok(
      canvasText.includes(responseActionTitle),
      `${createdWorkspace.label} designer should render the Response action added through the UI. Text: ${canvasText.slice(0, 1000)}`
    );
    await waitForSavedWorkflowContainsDesignerChanges(createdWorkspace);
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

  console.log(`[workspace-lifecycle] ${label}: searching for Response action`);
  await searchInDiscoveryPanelThroughDesigner(cdp, contextId, responseActionTitle);
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-response-search-entered`);
  await waitForSearchResultsThroughDesigner(cdp, contextId, 60000, `${label} Response search results`);

  await selectOperationThroughDesigner(cdp, contextId, responseActionTitle, ['response']);
  await waitForDesignerText(cdp, contextId, [responseActionTitle], 90000, `${label} Response action on canvas`);
  await captureLifecycleScreenshot(`workspace-lifecycle-${label}-response-action-added`);
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
  const result = await cdp.evaluate<{
    ok: boolean;
    reason?: string;
    point?: { x: number; y: number };
    text?: string;
    candidates?: string[];
  }>(
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

      for (const card of cards) {
        const title = normalize(card.querySelector('.msla-op-search-card-title')?.textContent);
        const text = normalize(title || card.textContent).toLowerCase();
        const aria = normalize(card.getAttribute('aria-label')).toLowerCase();
        const aid = normalize(card.getAttribute('data-automation-id')).toLowerCase();
        const combined = text + ' ' + aria + ' ' + aid;
        if (combined === 'all' || combined.startsWith('all ')) {
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

  assert.ok(
    result.ok && result.point,
    `Expected operation card "${operationName}". Reason=${result.reason} candidates=${JSON.stringify(result.candidates)} text=${String(
      result.text
    ).slice(0, 1000)}`
  );

  console.log(`[workspace-lifecycle] Selecting operation "${operationName}" (${result.text ?? ''})`);
  await clickPoint(cdp, result.point);
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
      expectedActionNames: [responseActionEntry[0]],
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

function hasCsproj(folderPath: string): boolean {
  return fs.existsSync(folderPath) && fs.readdirSync(folderPath).some((entry) => entry.endsWith('.csproj'));
}

function getCustomCodeDiagnosticFiles(appDir: string): string[] {
  const customCodePath = path.join(appDir, 'lib', 'custom');
  if (!fs.existsSync(customCodePath)) {
    return [];
  }

  return walkFiles(customCodePath).map((filePath) => path.relative(appDir, filePath));
}

async function startDebuggingGeneratedWorkspace(createdWorkspace: CreatedWorkspace): Promise<void> {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(createdWorkspace.appDir));
  assert.ok(folder, `Expected ${createdWorkspace.appDir} to be open as a workspace folder`);

  const launchPath = path.join(createdWorkspace.appDir, '.vscode', 'launch.json');
  const launchJson = JSON.parse(fs.readFileSync(launchPath, 'utf-8')) as {
    configurations?: Record<string, unknown>[];
  };
  const generatedConfig = launchJson.configurations?.[0];
  assert.ok(generatedConfig, `Expected ${launchPath} to contain a debug configuration`);
  assert.ok(generatedConfig.name, `Expected ${launchPath} debug configuration to have a name`);

  await stopDebuggingAndTasks();
  await killPortsBound([7071, ...azuritePorts]);
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
      { matchText: 'Enable connectors in Azure', optionText: 'Skip for now' },
      { matchText: 'Configure Azurite to autostart on project debug?', optionText: 'Enable AutoStart' },
      { matchText: 'Failed to verify "AzureWebJobsStorage" connection', optionText: 'Debug anyway' },
    ]);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-debug-prompts-handled`);
    await waitForDebugStartup(createdWorkspace, () => startDebuggingOutcome, 300000);
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
  timeoutMs: number
): Promise<void> {
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

      return debugOrTaskStarted && (await isHostRunning());
    },
    timeoutMs,
    `debug launch plus Functions host Running state for ${createdWorkspace.appDir}`
  );
}

async function runWorkflowThroughOverviewAndAssertSucceeded(createdWorkspace: CreatedWorkspace): Promise<void> {
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
    const contextId = await waitForWebviewFrameContext(cdp, {
      allTextIncludes: ['Run trigger', 'Refresh'],
      description: `${createdWorkspace.label} overview webview DOM context`,
      timeoutMs: 120000,
    });
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-overview-open`);
    await clickOverviewRunTrigger(cdp, contextId, createdWorkspace);
    await waitForNewRunStarted(createdWorkspace.wfName, previousRunName, 60000);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-overview-run-clicked`);
    await waitForOverviewRunStatus(cdp, contextId, createdWorkspace.label, 'Succeeded', 180000);
    await captureLifecycleScreenshot(`workspace-lifecycle-${createdWorkspace.label}-overview-run-succeeded`);
  } finally {
    cdp.dispose();
  }
}

async function clickOverviewRunTrigger(cdp: CdpEvaluator, contextId: number, createdWorkspace: CreatedWorkspace): Promise<void> {
  let lastState = '';
  let refreshedAfterReadyProbe = false;
  await waitUntil(
    async () => {
      const result = await getOverviewButtonState(cdp, contextId, 'Run trigger');
      const state = JSON.stringify(result);
      if (state !== lastState) {
        lastState = state;
        console.log(`[workspace-lifecycle] ${createdWorkspace.label}: Overview Run trigger state ${state}`);
      }

      if (result.found && !result.disabled && result.hasCallbackUrl && !result.isLoading) {
        return true;
      }

      if (!refreshedAfterReadyProbe && !result.isLoading) {
        await clickOverviewButton(cdp, contextId, 'Refresh').catch(() => undefined);
        refreshedAfterReadyProbe = true;
      }

      return false;
    },
    180000,
    `${createdWorkspace.label} Overview Run trigger button to become enabled with a callback URL. Last state: ${lastState}`
  );
  await clickOverviewButton(cdp, contextId, 'Run trigger');
  console.log(`[workspace-lifecycle] ${createdWorkspace.label}: clicked Overview Run trigger`);
}

async function waitForOverviewRunStatus(
  cdp: CdpEvaluator,
  contextId: number,
  label: string,
  targetStatus: string,
  timeoutMs: number
): Promise<void> {
  let lastStatus = '';
  let refreshAfterRunObserved = false;
  await waitUntil(
    async () => {
      const status = await getOverviewLatestRunStatus(cdp, contextId);
      if (status && status !== lastStatus) {
        lastStatus = status;
        console.log(`[workspace-lifecycle] ${label}: Overview latest run status "${status}"`);
      }

      if (status === targetStatus) {
        return true;
      }
      if (status === 'Failed' || status === 'Cancelled') {
        throw new Error(`${label} Overview latest run ended with status "${status}"`);
      }

      if (status && !refreshAfterRunObserved) {
        await clickOverviewButton(cdp, contextId, 'Refresh').catch(() => undefined);
        refreshAfterRunObserved = true;
      }

      return false;
    },
    timeoutMs,
    `${label} Overview latest run to reach ${targetStatus}; last status="${lastStatus}"`
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

async function getOverviewLatestRunStatus(cdp: CdpEvaluator, contextId: number): Promise<string> {
  return cdp.evaluate<string>(
    contextId,
    `(() => {
      const statuses = ['Succeeded', 'Running', 'Failed', 'Cancelled', 'Waiting'];
      const rows = Array.from(document.querySelectorAll('[role="row"], .ms-DetailsRow, tr'));
      for (const row of rows) {
        const text = row.textContent || '';
        if (text.includes('Status') && text.includes('Identifier')) {
          continue;
        }

        const status = statuses.find((candidate) => text.includes(candidate));
        if (status) {
          return status;
        }
      }

      const bodyText = document.body?.innerText || '';
      return statuses.find((candidate) => bodyText.includes(candidate)) || '';
    })()`
  );
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
      if (!fs.existsSync(workspaceFilePath) || !fs.existsSync(appDir) || !fs.existsSync(workflowJsonPath)) {
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

  assert.ok(fs.existsSync(workspaceDir), `Workspace directory should exist: ${workspaceDir}`);
  assert.ok(fs.existsSync(workspaceFilePath), `.code-workspace file should exist: ${workspaceFilePath}`);
  assert.ok(fs.existsSync(appDir), `Logic app directory should exist: ${appDir}`);
  assert.ok(fs.existsSync(workflowJsonPath), `workflow.json should exist: ${workflowJsonPath}`);

  const workspaceContent = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf-8')) as { folders?: Array<{ name?: string; path?: string }> };
  const folderPaths = (workspaceContent.folders ?? []).map((folder) => path.resolve(workspaceDir, folder.path ?? folder.name ?? ''));
  assert.ok(
    folderPaths.some((folderPath) => normalizeFsPath(folderPath) === normalizeFsPath(appDir)),
    'Generated workspace should include the logic app folder'
  );

  if (creationCase.appType !== 'standard') {
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
    folderPaths,
  };
}

function requiredValue(value: string | undefined): string {
  assert.ok(value, 'Expected required workspace creation value to be defined');
  return value;
}

async function enterFieldValue(cdp: CdpEvaluator, contextId: number, labels: FieldLabels, value: string): Promise<void> {
  await waitForFieldVisible(cdp, contextId, labels);
  const focusResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string }>(
    contextId,
    withField(
      labels,
      `input.focus();
      input.select();
      return { ok: true };`
    )
  );

  assert.strictEqual(
    focusResult.ok,
    true,
    `Failed to focus ${getLabels(labels).join('/')} field. ${focusResult.reason ?? ''} Text: ${focusResult.text ?? ''}`
  );

  try {
    await replaceFocusedInputText(cdp, value);
  } catch {
    await cdp.evaluate(
      contextId,
      withField(
        labels,
        `setInputValue(input, ${JSON.stringify(value)});
        return { ok: true };`
      )
    );
  }

  await waitUntil(
    async () => (await getFieldState(cdp, contextId, labels)).value === value,
    5000,
    `${getLabels(labels).join('/')} to equal ${value}`
  );
}

async function waitForFieldVisible(cdp: CdpEvaluator, contextId: number, labels: FieldLabels): Promise<void> {
  await waitUntil(
    async () => {
      const result = await getFieldState(cdp, contextId, labels).catch(() => undefined);
      return !!result?.ok;
    },
    10000,
    `field "${getLabels(labels).join('/')}" to be visible`
  );
}

async function waitForAsyncValidationToSettle(cdp: CdpEvaluator, contextId: number): Promise<void> {
  const pendingMessages = ['Validating path', 'Checking workspace availability'];
  await waitUntil(
    async () => {
      const pageText = await getPageText(cdp, contextId);
      return !pendingMessages.some((message) => containsIgnoreCase(pageText, message));
    },
    15000,
    'Create Workspace async validation to settle'
  );
}

async function assertNextButtonEnabled(cdp: CdpEvaluator, contextId: number, context: string): Promise<void> {
  let lastState: { found: boolean; disabled?: boolean; text?: string } | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      lastState = await getNextButtonState(cdp, contextId);
      if (lastState.found && !lastState.disabled) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  assert.fail(
    `Timed out waiting for Next button to be enabled for ${context}. Last state: ${JSON.stringify(lastState)}${
      lastError ? `. Last error: ${String(lastError)}` : ''
    }`
  );
}

async function selectRadioOption(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<void> {
  const focusResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string }>(
    contextId,
    `(() => {
      const expected = ${JSON.stringify(labelText)};
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent);
          return text.length > 0 && text.length < 180 && text.includes(expected);
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      if (!label) {
        return { ok: false, reason: 'Radio label not found', text: document.body?.innerText || '' };
      }

      const radioRoot = label.closest('[role="radio"], .fui-Radio') || label;
      const input = radioRoot.querySelector('input[type="radio"]');
      if (!(input instanceof HTMLInputElement)) {
        return { ok: false, reason: 'Radio input not found', text: radioRoot.outerHTML };
      }

      input.focus();
      return { ok: document.activeElement === input, reason: document.activeElement === input ? undefined : 'Radio input did not receive focus', text: radioRoot.outerHTML };
    })()`
  );

  assert.strictEqual(
    focusResult.ok,
    true,
    focusResult.reason ?? `Failed to focus radio option "${labelText}". Text: ${focusResult.text ?? ''}`
  );
  await pressKey(cdp, 'Space', ' ', 32);
  await waitUntil(() => isRadioOptionChecked(cdp, contextId, labelText), 5000, `radio option "${labelText}" to be checked`);
}

async function selectDropdownOption(cdp: CdpEvaluator, contextId: number, labelText: string, optionText: string): Promise<void> {
  if (await isDropdownValueSelected(cdp, contextId, labelText, optionText)) {
    return;
  }

  const focusResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; point?: { x: number; y: number } }>(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent).toLowerCase();
          return text.length > 0 && text.length < 160 && text.includes(${JSON.stringify(labelText.toLowerCase())});
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      if (!label) {
        return { ok: false, reason: 'Dropdown label not found', text: document.body?.innerText || '' };
      }

      const dropdownId = label.getAttribute('for');
      const field = label.closest('[class*="fui-Field"]') || label.parentElement;
      const dropdown = (dropdownId ? document.getElementById(dropdownId) : null) || field?.querySelector('button[role="combobox"]');
      if (!(dropdown instanceof HTMLButtonElement)) {
        return { ok: false, reason: 'Dropdown button not found', text: document.body?.innerText || '' };
      }

      dropdown.scrollIntoView({ block: 'center', inline: 'center' });
      dropdown.focus();
      const rect = dropdown.getBoundingClientRect();
      return { ok: true, point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } };
    })()`
  );

  assert.strictEqual(
    focusResult.ok,
    true,
    focusResult.reason ?? `Failed to focus "${labelText}" dropdown. Text: ${focusResult.text ?? ''}`
  );
  assert.ok(focusResult.point, `Failed to locate "${labelText}" dropdown click point.`);
  await clickPoint(cdp, focusResult.point);
  if (!(await waitForDropdownOptions(cdp, contextId, 1000))) {
    await pressKey(cdp, 'Enter', undefined, 13);
  }
  if (!(await waitForDropdownOptions(cdp, contextId, 1000))) {
    await pressKey(cdp, 'Space', ' ', 32);
  }
  if (!(await waitForDropdownOptions(cdp, contextId, 1000))) {
    await pressKey(cdp, 'ArrowDown', 'ArrowDown', 40);
    await pressKey(cdp, 'Enter', undefined, 13);
    if (await isDropdownValueSelected(cdp, contextId, labelText, optionText)) {
      return;
    }
  }

  const optionResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; options?: string[]; optionIndex?: number }>(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const options = Array.from(document.querySelectorAll('[role="option"]')).filter(isVisible);
      const option = options.find((candidate) => normalize(candidate.textContent) === ${JSON.stringify(optionText)});
      if (!(option instanceof HTMLElement)) {
        return {
          ok: false,
          reason: 'Dropdown option not found',
          options: options.map((candidate) => normalize(candidate.textContent)),
          text: document.body?.innerText || '',
        };
      }

      return { ok: true, optionIndex: options.indexOf(option) };
    })()`
  );

  assert.strictEqual(
    optionResult.ok,
    true,
    `Failed to select "${optionText}" from "${labelText}". Reason: ${optionResult.reason ?? 'unknown'}. Options: ${JSON.stringify(
      optionResult.options
    )}. Text: ${optionResult.text ?? ''}`
  );
  for (let index = 0; index < (optionResult.optionIndex ?? 0); index++) {
    await pressKey(cdp, 'ArrowDown', 'ArrowDown', 40);
  }
  await pressKey(cdp, 'Enter', undefined, 13);
  await waitUntil(
    () => isDropdownValueSelected(cdp, contextId, labelText, optionText),
    5000,
    `"${labelText}" dropdown to select "${optionText}"`
  );
}

async function handleDesignerQuickPickPrompts(timeoutMs = 20000): Promise<void> {
  await handleWorkbenchPrompts(
    [
      { matchText: 'Enable connectors in Azure', optionText: 'Skip for now' },
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

async function hasDropdownOptions(cdp: CdpEvaluator, contextId: number): Promise<boolean> {
  return cdp.evaluate<boolean>(
    contextId,
    `(() => {
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      return Array.from(document.querySelectorAll('[role="option"]')).some(isVisible);
    })()`
  );
}

async function waitForDropdownOptions(cdp: CdpEvaluator, contextId: number, timeoutMs: number): Promise<boolean> {
  try {
    await waitUntil(() => hasDropdownOptions(cdp, contextId), timeoutMs, 'dropdown options to become visible');
    return true;
  } catch {
    return false;
  }
}

async function isRadioOptionChecked(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<boolean> {
  const result = await cdp.evaluate<{ checked: boolean }>(
    contextId,
    `(() => {
      const expected = ${JSON.stringify(labelText)};
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent);
          return text.length > 0 && text.length < 180 && text.includes(expected);
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const radioRoot = label?.closest('[role="radio"], .fui-Radio') || label;
      const input = radioRoot?.querySelector('input[type="radio"]');
      return { checked: input instanceof HTMLInputElement ? input.checked : false };
    })()`
  );
  return result.checked;
}

async function isDropdownValueSelected(cdp: CdpEvaluator, contextId: number, labelText: string, optionText: string): Promise<boolean> {
  const result = await cdp.evaluate<{ selected: boolean }>(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const label = Array.from(document.querySelectorAll('label, span, div'))
        .filter((candidate) => {
          const text = normalize(candidate.textContent).toLowerCase();
          return text.length > 0 && text.length < 160 && text.includes(${JSON.stringify(labelText.toLowerCase())});
        })
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const dropdownId = label?.getAttribute('for');
      const field = label?.closest('[class*="fui-Field"]') || label?.parentElement;
      const dropdown = (dropdownId ? document.getElementById(dropdownId) : null) || field?.querySelector('button[role="combobox"]');
      const text = dropdown?.textContent || '';
      return { selected: normalize(text).includes(${JSON.stringify(optionText)}) };
    })()`
  );
  return result.selected;
}

async function pressKey(cdp: CdpEvaluator, code: string, key?: string, windowsVirtualKeyCode?: number): Promise<void> {
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: key ?? code,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: key ?? code,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
}

async function clickPoint(cdp: CdpEvaluator, point: { x: number; y: number }): Promise<void> {
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
    button: 'none',
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
}

async function replaceFocusedInputText(cdp: CdpEvaluator, value: string): Promise<void> {
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Control',
    code: 'ControlLeft',
    windowsVirtualKeyCode: 17,
    nativeVirtualKeyCode: 17,
    modifiers: 2,
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

  if (value) {
    await cdp.send('Input.insertText', { text: value });
  }
}

async function getFieldState(
  cdp: CdpEvaluator,
  contextId: number,
  labels: FieldLabels
): Promise<{ ok: boolean; reason?: string; value?: string; text?: string }> {
  return cdp.evaluate(
    contextId,
    withField(
      labels,
      `return {
      ok: true,
      value: input.value,
      text: document.body?.innerText || '',
    };`
    )
  );
}

async function getNextButtonState(cdp: CdpEvaluator, contextId: number): Promise<{ found: boolean; disabled?: boolean; text?: string }> {
  return cdp.evaluate(
    contextId,
    `(() => {
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const buttons = Array.from(document.querySelectorAll('button')).filter(isVisible);
      const button = buttons.find((candidate) => (candidate.textContent || '').includes('Next'));
      const pageText = document.body?.innerText || '';
      if (!button) {
        return { found: false, text: pageText };
      }

      const disabled = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
      return { found: true, disabled, text: pageText };
    })()`
  );
}

async function getPageText(cdp: CdpEvaluator, contextId: number): Promise<string> {
  return cdp.evaluate<string>(contextId, 'document.body?.innerText || ""').catch((error) => String(error));
}

function withField(labels: FieldLabels, action: string): string {
  return `(() => {
      const labelsToFind = ${JSON.stringify(getLabels(labels))};
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const visibleInputs = Array.from(document.querySelectorAll('input')).filter(isVisible);
      const inputByAttribute = visibleInputs
        .filter((candidate) => {
          const searchableText = [
            candidate.getAttribute('aria-label'),
            candidate.getAttribute('placeholder'),
            candidate.getAttribute('name'),
            candidate.id,
          ].map(normalize).join(' ').toLowerCase();
          return labelsToFind.some((expected) => searchableText.includes(expected.toLowerCase()));
        })
        .sort((a, b) => normalize(a.getAttribute('placeholder') || a.getAttribute('aria-label') || a.id).length - normalize(b.getAttribute('placeholder') || b.getAttribute('aria-label') || b.id).length)[0];
      const visibleTextElements = Array.from(document.querySelectorAll('label, span, div, p'))
        .filter(isVisible)
        .filter((candidate) => {
          const text = normalize(candidate.textContent);
          return text.length > 0 && text.length < 160;
        });
      const exactLabel = visibleTextElements
        .filter((candidate) => labelsToFind.some((expected) => normalize(candidate.textContent).toLowerCase() === expected.toLowerCase()))
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const partialLabel = visibleTextElements
        .filter((candidate) =>
          labelsToFind.some((expected) => normalize(candidate.textContent).toLowerCase().includes(expected.toLowerCase()))
        )
        .sort((a, b) => normalize(a.textContent).length - normalize(b.textContent).length)[0];
      const label = exactLabel || partialLabel;
      if (!label && !inputByAttribute) {
        return { ok: false, reason: 'Field label not found', text: document.body?.innerText || '' };
      }

      const inputId = label?.getAttribute('for');
      const field = label?.closest('[class*="fui-Field"]') || label?.parentElement?.parentElement || label?.parentElement;
      const labelRect = label?.getBoundingClientRect();
      const nearestInput = labelRect
        ? visibleInputs
            .map((candidate) => ({ candidate, rect: candidate.getBoundingClientRect() }))
            .filter(({ rect }) => rect.bottom >= labelRect.top - 5)
            .sort((a, b) => {
              const scoreA = a.rect.top >= labelRect.bottom - 5 ? a.rect.top - labelRect.bottom : 0;
              const scoreB = b.rect.top >= labelRect.bottom - 5 ? b.rect.top - labelRect.bottom : 0;
              return scoreA - scoreB || a.rect.top - b.rect.top;
            })[0]?.candidate
        : undefined;
      const fieldInputs = field ? Array.from(field.querySelectorAll('input')).filter(isVisible) : [];
      const fieldInput =
        fieldInputs.length === 1
          ? fieldInputs[0]
          : labelRect
            ? fieldInputs
                .map((candidate) => ({ candidate, rect: candidate.getBoundingClientRect() }))
                .filter(({ rect }) => rect.bottom >= labelRect.top - 5)
                .sort((a, b) => {
                  const scoreA = a.rect.top >= labelRect.bottom - 5 ? a.rect.top - labelRect.bottom : 0;
                  const scoreB = b.rect.top >= labelRect.bottom - 5 ? b.rect.top - labelRect.bottom : 0;
                  return scoreA - scoreB || a.rect.top - b.rect.top;
                })[0]?.candidate
            : undefined;
      const input = inputByAttribute || (inputId ? document.getElementById(inputId) : null) || fieldInput || nearestInput;
      if (!(input instanceof HTMLInputElement)) {
        return { ok: false, reason: 'Field input not found', text: document.body?.innerText || '', labelHtml: label?.outerHTML };
      }

      const setInputValue = (inputElement, value) => {
        inputElement.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(inputElement, value);
        inputElement.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: value ? 'insertText' : 'deleteContentBackward', data: value }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        inputElement.blur();
      };

      ${action}
    })()`;
}

function getLabels(labels: FieldLabels): string[] {
  return Array.isArray(labels) ? labels : [labels];
}

function getWebviewTabs(viewType: string): vscode.Tab[] {
  return vscode.window.tabGroups.all.flatMap((group) =>
    group.tabs.filter((tab) => {
      return getTabViewType(tab) === `mainThreadWebview-${viewType}`;
    })
  );
}

function getTabViewType(tab: vscode.Tab): string | undefined {
  const input = tab.input as { viewType?: unknown };
  return typeof input.viewType === 'string' ? input.viewType : undefined;
}

async function waitForWebviewTab(viewType: string, previousCount: number, timeoutMs = 10000): Promise<vscode.Tab> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const tabs = getWebviewTabs(viewType);
    if (tabs.length > previousCount) {
      return tabs[tabs.length - 1];
    }

    if (tabs.length > 0 && previousCount === 0) {
      return tabs[tabs.length - 1];
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  assert.fail(`Timed out waiting for ${viewType} webview tab to open. Open tabs: ${describeOpenTabs()}`);
}

async function closeWebviewTabs(viewType: string): Promise<void> {
  const tabs = getWebviewTabs(viewType);
  if (tabs.length > 0) {
    await vscode.window.tabGroups.close(tabs);
  }
}

async function closeAllTabs(): Promise<void> {
  const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
  if (tabs.length > 0) {
    await vscode.window.tabGroups.close(tabs);
  }
}

function describeOpenTabs(): string {
  return JSON.stringify(
    vscode.window.tabGroups.all.flatMap((group) =>
      group.tabs.map((tab) => ({
        label: tab.label,
        isActive: tab.isActive,
        inputType: tab.input?.constructor?.name,
        viewType: getTabViewType(tab),
      }))
    )
  );
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

function containsIgnoreCase(value: string, expected: string): boolean {
  return value.toLowerCase().includes(expected.toLowerCase());
}

function uniqueName(prefix: string): string {
  return `${prefix}${Date.now().toString(36).slice(-5)}`;
}

function normalizeFsPath(fsPath: string): string {
  const normalizedPath = path.normalize(fsPath);
  return process.platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath;
}
