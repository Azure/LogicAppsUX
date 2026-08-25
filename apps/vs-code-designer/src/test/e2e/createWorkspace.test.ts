import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { connectToVsCodeCdp, waitForCreateWorkspaceFrameContext } from './cdpClient';
import type { FieldLabels, WorkspaceAppType, WorkspaceCreationCase, WorkflowType } from './createWorkspaceTypes';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { captureCliScreenshot } from './screenshot';
import { containsIgnoreCase, uniqueName } from './testUtils';
import { waitForVisibleDelay } from './visibleDelay';
import { closeWebviewTabs, getTabViewType, getWebviewTabs, waitForWebviewTab } from './webviewTabs';

const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const createWorkspaceCommand = 'azureLogicAppsStandard.createWorkspace';
const createWorkspaceViewType = 'CreateWorkspace';
const createWorkspaceTabViewType = `mainThreadWebview-${createWorkspaceViewType}`;
const createWorkspaceTitle = 'Create workspace';
const nameValidationMessage = 'must start with a letter and can only contain letters, digits';
const emptyValidationMessage = 'cannot be empty';
const reservedNameValidationMessage = 'reserved and cannot be used';
const sameAsLogicAppValidationMessage = 'cannot be the same as the logic app name';
const namespaceValidationMessage = 'valid C# namespace';
const functionsExtensionId = 'ms-azuretools.vscode-azurefunctions';
const dotnetExtensionId = 'ms-dotnettools.csharp';
const csDevKitExtensionId = 'ms-dotnettools.csdevkit';
const logicAppsProjectLanguageSetting = 'azureLogicAppsStandard.projectLanguage';
const logicAppsProjectRuntimeSetting = 'azureLogicAppsStandard.projectRuntime';
const logicAppsDeploySubpathSetting = 'azureLogicAppsStandard.deploySubpath';
const logicAppsPickProcessCommand = 'azureLogicAppsStandard.pickFuncProcess';
const logicAppsGetDebugSymbolDllCommand = 'azureLogicAppsStandard.getDebugSymbolDll';
const funcCoreToolsBinaryPathSetting = '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}';
const dotnetBinaryPathSetting = '${config:azureLogicAppsStandard.dotnetBinaryPath}';
const funcHostStartTaskLabel = 'func: host start';
const funcWatchProblemMatcher = '$func-watch';

type CdpEvaluator = {
  evaluate<T>(contextId: number, expression: string): Promise<T>;
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
};
type CreateWorkspaceGroup = 'default' | 'behavior' | 'core-matrix' | 'preview-matrix' | 'codeful' | 'fixtures-manifest' | 'full';

interface FieldValidationCase {
  name: string;
  labels: FieldLabels;
  invalidValue: string;
  expectedMessage: string;
  validValue: string;
}

/**
 * Must stay downstream-compatible with src/test/ui/workspaceManifest.ts.
 * ExTester p41a-fixtures remains the canonical producer for run-e2e.js phases;
 * this CLI shape exists for focused @vscode/test-cli fixture generation.
 */
interface WorkspaceManifestEntry {
  label: string;
  parentDir: string;
  wsName: string;
  appName: string;
  wfName: string;
  appType: WorkspaceAppType;
  wfType: WorkflowType;
  ccFolderName?: string;
  fnName?: string;
  fnNamespace?: string;
  wsDir: string;
  wsFilePath: string;
  appDir: string;
  wfDir: string;
  createdAt: string;
}

type WorkflowAction = {
  type?: unknown;
  kind?: unknown;
  inputs?: {
    functionName?: unknown;
    parameters?: Record<string, unknown>;
    statusCode?: unknown;
    body?: unknown;
    modelConfigurations?: Record<string, unknown>;
  };
  limit?: unknown;
  runAfter?: Record<string, unknown>;
  tools?: unknown;
};

type WorkflowTrigger = {
  type?: unknown;
  kind?: unknown;
  inputs?: unknown;
};

type WorkflowJson = {
  kind?: string;
  definition?: {
    actions?: Record<string, WorkflowAction>;
    contentVersion?: unknown;
    outputs?: Record<string, unknown>;
    triggers?: Record<string, WorkflowTrigger>;
  };
};

type WorkspaceJson = {
  folders?: Array<{ name?: string; path?: string }>;
};

type ExtensionsJson = {
  recommendations?: unknown;
};

type LaunchConfiguration = {
  [key: string]: unknown;
  name?: unknown;
  type?: unknown;
  request?: unknown;
  processId?: unknown;
  funcRuntime?: unknown;
  customCodeRuntime?: unknown;
  isCodeless?: unknown;
};

type LaunchJson = {
  version?: unknown;
  configurations?: unknown;
};

type TaskJson = {
  [key: string]: unknown;
  label?: unknown;
  type?: unknown;
  command?: unknown;
  args?: unknown;
  isBackground?: unknown;
  problemMatcher?: unknown;
  dependsOn?: unknown;
  group?: unknown;
  options?: unknown;
  windows?: unknown;
  linux?: unknown;
  osx?: unknown;
};

type TasksJson = {
  version?: unknown;
  tasks?: unknown;
  inputs?: unknown;
};

interface Point {
  x: number;
  y: number;
}

installDialogGuard();

suite('Create Workspace Experience Tests', () => {
  const createWorkspaceGroup = getCreateWorkspaceGroup();
  const tempWorkspaceParentPath = createWorkspaceParentPath(createWorkspaceGroup);
  const createWorkspaceCaseFilter = process.env.LA_E2E_CLI_CREATE_WORKSPACE_CASE;

  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension(logicAppsExtensionId);
    assert.ok(extension, `Expected ${logicAppsExtensionId} to be loaded from the extension development path`);
    await extension.activate();

    if (createWorkspaceGroup === 'fixtures-manifest') {
      clearFixtureManifest();
    }
  });

  suiteTeardown(async () => {
    await waitForVisibleDelay('Create Workspace smoke');
    await closeWebviewTabs(createWorkspaceViewType);
  });

  suiteTeardown(() => {
    if (createWorkspaceGroup === 'fixtures-manifest' || process.env.LA_E2E_CLI_PRESERVE_WORKSPACES === '1') {
      console.log(`[create-workspace-smoke] Preserving fixture workspace parent ${tempWorkspaceParentPath}`);
      return;
    }

    try {
      fs.rmSync(tempWorkspaceParentPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`[create-workspace-smoke] Unable to remove temp workspace parent ${tempWorkspaceParentPath}: ${String(error)}`);
    }
  });

  if (shouldRunCreateWorkspaceGroup(createWorkspaceGroup, ['default', 'behavior', 'full'])) {
    test('Should open the Create Workspace webview and validate fields before project creation', async () => {
      assertEmptyWorkspace('before executing Create Workspace');

      const tabsBefore = getWebviewTabs(createWorkspaceViewType).length;

      await vscode.commands.executeCommand(createWorkspaceCommand);

      const tab = await waitForWebviewTab(createWorkspaceViewType, tabsBefore);
      assert.strictEqual(getTabViewType(tab), createWorkspaceTabViewType);
      assert.strictEqual(tab.label, createWorkspaceTitle);

      const cdp = await connectToVsCodeCdp({ targetName: 'Create Workspace webview' });
      try {
        const createWorkspaceContextId = await waitForCreateWorkspaceFrameContext(cdp);
        await assertInitialCreateWorkspaceContent(cdp, createWorkspaceContextId);
        await captureCliScreenshot('create-workspace-initial-form');
        await runStandardRequiredFieldProgression(cdp, createWorkspaceContextId, tempWorkspaceParentPath);
        await runStandardFieldValidationCases(cdp, createWorkspaceContextId, tempWorkspaceParentPath);
        await captureCliScreenshot('create-workspace-standard-fields-valid');

        await runCustomCodeFieldValidationCases(cdp, createWorkspaceContextId, tempWorkspaceParentPath);
        await captureCliScreenshot('create-workspace-custom-code-fields-valid');

        await runRulesEngineFieldValidationCases(cdp, createWorkspaceContextId, tempWorkspaceParentPath);
        await captureCliScreenshot('create-workspace-rules-engine-fields-valid');
      } finally {
        cdp.dispose();
      }

      await assertNoDialogAttempts('Create Workspace command execution');
    });
  }

  if (shouldRunCreateWorkspaceGroup(createWorkspaceGroup, ['behavior', 'full'])) {
    test('Should verify review back navigation and app type cleanup', async function () {
      this.timeout(240000);

      for (const creationCase of filterCreationCases(getReviewBackCases(), createWorkspaceCaseFilter)) {
        const { cdp, contextId } = await openCreateWorkspaceContext();
        try {
          await fillWorkspaceCreationFields(cdp, contextId, creationCase, tempWorkspaceParentPath);
          await assertNextButtonEnabled(cdp, contextId, `${creationCase.label} review/back fields`);
          await goToReviewAndBack(cdp, contextId, creationCase);
          await assertWorkspaceCreationFields(cdp, contextId, creationCase, tempWorkspaceParentPath);
          await captureWorkspaceCreationFormScreenshots(cdp, contextId, creationCase.label, 'review-back');
        } finally {
          cdp.dispose();
        }
      }

      await verifyWorkflowTypeDescriptionAndReview(tempWorkspaceParentPath);
      await verifyAppTypeCleanup(tempWorkspaceParentPath);
      await assertNoDialogAttempts('Create Workspace review/back flows');
    });
  }

  if (shouldRunCreateWorkspaceGroup(createWorkspaceGroup, ['default', 'core-matrix', 'full'])) {
    test('Should create core Standard, custom code, and rules engine workspaces from the webview', async function () {
      this.timeout(600000);

      for (const creationCase of filterCreationCases(getCoreCreationCases(), createWorkspaceCaseFilter)) {
        await createWorkspaceThroughWebview(creationCase, tempWorkspaceParentPath);
        verifyCreatedWorkspace(tempWorkspaceParentPath, creationCase);
        await captureCliScreenshot(`create-workspace-${creationCase.label}-created`);
      }

      await assertNoDialogAttempts('Create Workspace core project creation flows');
    });
  }

  if (shouldRunCreateWorkspaceGroup(createWorkspaceGroup, ['fixtures-manifest'])) {
    test('Should create downstream-compatible workspace fixtures manifest from the webview', async function () {
      this.timeout(700000);

      const manifestEntries: WorkspaceManifestEntry[] = [];
      for (const creationCase of filterCreationCases(getFixtureManifestCreationCases(), createWorkspaceCaseFilter)) {
        await createWorkspaceThroughWebview(creationCase, tempWorkspaceParentPath);
        verifyCreatedWorkspace(tempWorkspaceParentPath, creationCase);

        const manifestEntry = buildWorkspaceManifestEntry(tempWorkspaceParentPath, creationCase);
        assertWorkspaceManifestEntry(manifestEntry);
        manifestEntries.push(manifestEntry);
        writeFixtureManifest(manifestEntries);
        await captureCliScreenshot(`create-workspace-fixtures-${creationCase.label}-created`);
      }

      assertFixtureManifestComplete(manifestEntries, createWorkspaceCaseFilter);
      await assertNoDialogAttempts('Create Workspace fixture manifest flows');
    });
  }

  if (shouldRunCreateWorkspaceGroup(createWorkspaceGroup, ['preview-matrix', 'full'])) {
    test('Should create preview workflow type workspaces from the webview', async function () {
      this.timeout(600000);

      for (const creationCase of filterCreationCases(getPreviewCreationCases(), createWorkspaceCaseFilter)) {
        await createWorkspaceThroughWebview(creationCase, tempWorkspaceParentPath);
        verifyCreatedWorkspace(tempWorkspaceParentPath, creationCase);
        await captureCliScreenshot(`create-workspace-${creationCase.label}-created`);
      }

      await assertNoDialogAttempts('Create Workspace preview project creation flows');
    });
  }

  if (shouldRunCreateWorkspaceGroup(createWorkspaceGroup, ['codeful', 'full'])) {
    test('Should create modern and legacy-control codeful workspaces from the webview', async function () {
      this.timeout(480000);

      for (const creationCase of filterCreationCases(getCodefulCreationCases(), createWorkspaceCaseFilter)) {
        await createWorkspaceThroughWebview(creationCase, tempWorkspaceParentPath);
        applyCodefulControlVariant(tempWorkspaceParentPath, creationCase);
        verifyCreatedWorkspace(tempWorkspaceParentPath, creationCase);
        await captureCliScreenshot(`create-workspace-${creationCase.label}-created`);
      }

      await assertNoDialogAttempts('Create Workspace codeful project creation flows');
    });
  }
});

function getCreateWorkspaceGroup(): CreateWorkspaceGroup {
  const group = process.env.LA_E2E_CLI_CREATE_WORKSPACE_GROUP;
  if (
    group === 'behavior' ||
    group === 'core-matrix' ||
    group === 'preview-matrix' ||
    group === 'codeful' ||
    group === 'fixtures-manifest' ||
    group === 'full'
  ) {
    return group;
  }

  return 'default';
}

function createWorkspaceParentPath(group: CreateWorkspaceGroup): string {
  if (group !== 'fixtures-manifest') {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'la-e2e-cli-create-workspace-'));
  }

  const parentPath = path.dirname(getFixtureManifestPath());
  fs.mkdirSync(parentPath, { recursive: true });
  return parentPath;
}

function shouldRunCreateWorkspaceGroup(current: CreateWorkspaceGroup, groups: CreateWorkspaceGroup[]): boolean {
  return groups.includes(current);
}

function filterCreationCases(cases: WorkspaceCreationCase[], caseFilter: string | undefined): WorkspaceCreationCase[] {
  if (!caseFilter) {
    return cases;
  }

  const labels = caseFilter
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
  return cases.filter((creationCase) => labels.includes(creationCase.label));
}

function getReviewBackCases(): WorkspaceCreationCase[] {
  return [
    createWorkspaceCase('review-standard', 'standard', 'Logic app (Standard)', 'Stateful', 'clirvstd'),
    createWorkspaceCase('review-custom-code', 'customCode', 'Logic app with custom code', 'Stateful', 'clirvcc'),
    createWorkspaceCase('review-rules-engine', 'rulesEngine', 'Logic app with rules engine', 'Stateful', 'clirvre'),
  ];
}

function getCoreCreationCases(): WorkspaceCreationCase[] {
  return [
    createWorkspaceCase('standard-stateful', 'standard', 'Logic app (Standard)', 'Stateful', 'clistdsf'),
    createWorkspaceCase('standard-stateless', 'standard', 'Logic app (Standard)', 'Stateless', 'clistdsl'),
    createWorkspaceCase('custom-code-stateful', 'customCode', 'Logic app with custom code', 'Stateful', 'cliccsf'),
    createWorkspaceCase('custom-code-stateless', 'customCode', 'Logic app with custom code', 'Stateless', 'cliccsl'),
    createWorkspaceCase('rules-engine-stateful', 'rulesEngine', 'Logic app with rules engine', 'Stateful', 'cliresf'),
    createWorkspaceCase('rules-engine-stateless', 'rulesEngine', 'Logic app with rules engine', 'Stateless', 'cliresl'),
  ];
}

function getFixtureManifestCreationCases(): WorkspaceCreationCase[] {
  return [
    createWorkspaceCase('standard-stateful', 'standard', 'Logic app (Standard)', 'Stateful', 'clifixstdsf'),
    createWorkspaceCase('standard-stateless', 'standard', 'Logic app (Standard)', 'Stateless', 'clifixstdsl'),
    createWorkspaceCase('custom-code-stateful', 'customCode', 'Logic app with custom code', 'Stateful', 'clifixccsf'),
    createWorkspaceCase('rules-engine-stateful', 'rulesEngine', 'Logic app with rules engine', 'Stateful', 'clifixresf'),
  ];
}

function getPreviewCreationCases(): WorkspaceCreationCase[] {
  return [
    createWorkspaceCase('standard-autonomous-agent', 'standard', 'Logic app (Standard)', 'Autonomous agents (Preview)', 'clistdaa'),
    createWorkspaceCase('standard-conversational-agent', 'standard', 'Logic app (Standard)', 'Conversational agents (Preview)', 'clistdca'),
    createWorkspaceCase(
      'custom-code-autonomous-agent',
      'customCode',
      'Logic app with custom code',
      'Autonomous agents (Preview)',
      'cliccaa'
    ),
    createWorkspaceCase(
      'custom-code-conversational-agent',
      'customCode',
      'Logic app with custom code',
      'Conversational agents (Preview)',
      'cliccca'
    ),
    createWorkspaceCase(
      'rules-engine-autonomous-agent',
      'rulesEngine',
      'Logic app with rules engine',
      'Autonomous agents (Preview)',
      'clireaa'
    ),
    createWorkspaceCase(
      'rules-engine-conversational-agent',
      'rulesEngine',
      'Logic app with rules engine',
      'Conversational agents (Preview)',
      'clireca'
    ),
  ];
}

function getCodefulCreationCases(): WorkspaceCreationCase[] {
  // The latest-stable @vscode/test-cli host exposes the same product picker as
  // ExTester: one "Logic app (codeful)" radio option. ExTester selects the
  // legacy-control variant by creating a second codeful workspace through that
  // radio and patching only the generated .csproj target hooks afterward, so the
  // CLI suite mirrors that parity shape here without changing product code.
  const modern = createWorkspaceCase('codeful-modern-control', 'codeful', 'Logic app (codeful)', 'Stateful', 'clicodemodern');
  modern.codefulControlVariant = 'modern-control';

  const legacy = createWorkspaceCase('codeful-legacy-control', 'codeful', 'Logic app (codeful)', 'Stateful', 'clicodelegacy');
  legacy.codefulControlVariant = 'legacy-control';

  return [modern, legacy];
}

function createWorkspaceCase(
  label: string,
  appType: WorkspaceAppType,
  radioLabel: string,
  workflowType: WorkflowType,
  prefix: string
): WorkspaceCreationCase {
  const baseName = uniqueName(prefix);
  const creationCase: WorkspaceCreationCase = {
    label,
    appType,
    radioLabel,
    wsName: `${baseName}ws`,
    appName: `${baseName}app`,
    wfName: `${baseName}wf`,
    workflowType,
  };

  if (appType === 'customCode' || appType === 'rulesEngine') {
    creationCase.functionFolderName = `${baseName}funcfolder`;
    creationCase.functionNamespace = appType === 'rulesEngine' ? 'RulesEngineNamespace' : 'MyCompany.Functions';
    creationCase.functionName = `${baseName}fn`;
  }

  return creationCase;
}

function assertEmptyWorkspace(context: string): void {
  assert.ok(
    !vscode.workspace.workspaceFile || vscode.workspace.workspaceFile.scheme === 'untitled',
    `No saved .code-workspace file should be loaded ${context}. Actual: ${vscode.workspace.workspaceFile?.toString()}`
  );
  assert.deepStrictEqual(vscode.workspace.workspaceFolders ?? [], [], `No folders should be loaded ${context}`);
}

async function runStandardFieldValidationCases(cdp: CdpEvaluator, contextId: number, validPath: string): Promise<void> {
  await runInvalidThenValidCase(cdp, contextId, {
    name: 'workspace parent folder path rejects non-existent paths',
    labels: 'Workspace parent folder path',
    invalidValue: 'Z:\\nonexistent\\fake\\path\\that\\does\\not\\exist',
    expectedMessage: 'not exist',
    validValue: validPath,
  });

  await runEmptyThenValidCase(cdp, contextId, 'workspace parent folder path is required', 'Workspace parent folder path', validPath);

  await runNameFieldCases(cdp, contextId, 'workspace name', 'Workspace name', 'validws', [
    ['starts with number', '123invalid', nameValidationMessage],
    ['contains spaces', 'my workspace', nameValidationMessage],
    ['contains special characters', 'ws@#$name', nameValidationMessage],
    ['starts with hyphen', '-leadinghyphen', nameValidationMessage],
    ['starts with underscore', '_leadingunderscore', nameValidationMessage],
    ['ends with hyphen', 'trailinghyphen-', nameValidationMessage],
    ['contains dots', 'my.workspace', nameValidationMessage],
    ['ends with underscore', 'myws_', nameValidationMessage],
    ['is empty', '', emptyValidationMessage],
  ]);

  await runNameFieldCases(cdp, contextId, 'logic app name', 'Logic app name', 'validapp', [
    ['starts with number', '999app', nameValidationMessage],
    ['is empty', '', emptyValidationMessage],
    ['contains special characters', 'app@name', nameValidationMessage],
    ['contains spaces', 'my app', nameValidationMessage],
    ['starts with underscore', '_myapp', nameValidationMessage],
    ['starts with hyphen', '-myapp', nameValidationMessage],
    ['ends with hyphen', 'myapp-', nameValidationMessage],
  ]);

  await runNameFieldCases(cdp, contextId, 'workflow name', 'Workflow name', 'validwf', [
    ['starts with number', '123workflow', nameValidationMessage],
    ['is empty', '', emptyValidationMessage],
    ['contains special characters', 'wf@name', nameValidationMessage],
    ['contains spaces', 'my workflow', nameValidationMessage],
    ['starts with underscore', '_workflow', nameValidationMessage],
    ['starts with hyphen', '-workflow', nameValidationMessage],
    ['ends with hyphen', 'workflow-', nameValidationMessage],
    ['is reserved Artifacts', 'Artifacts', reservedNameValidationMessage],
    ['is reserved lib', 'lib', reservedNameValidationMessage],
    ['is reserved artifacts lowercase', 'artifacts', reservedNameValidationMessage],
    ['is reserved ARTIFACTS uppercase', 'ARTIFACTS', reservedNameValidationMessage],
    ['is reserved workflow-designtime', 'workflow-designtime', reservedNameValidationMessage],
    ['is reserved custom', 'custom', reservedNameValidationMessage],
  ]);

  await enterFieldValue(cdp, contextId, 'Workflow name', 'la-trigger-github');
  await waitForFieldValidationMessageToClear(cdp, contextId, 'Workflow name', nameValidationMessage);
  await selectRadioOption(cdp, contextId, 'Logic app (Standard)');
  await selectDropdownOption(cdp, contextId, 'Workflow type', 'Stateful');
  await waitForAsyncValidationToSettle(cdp, contextId);
  await assertNextButtonEnabled(cdp, contextId, 'standard fields are valid');
}

async function runStandardRequiredFieldProgression(cdp: CdpEvaluator, contextId: number, validPath: string): Promise<void> {
  await selectRadioOption(cdp, contextId, 'Logic app (Standard)');
  await waitForFieldVisible(cdp, contextId, 'Workspace parent folder path');
  await waitForFieldVisible(cdp, contextId, 'Workspace name');
  await waitForFieldVisible(cdp, contextId, 'Logic app name');
  await waitForFieldVisible(cdp, contextId, 'Workflow name');

  await enterFieldValue(cdp, contextId, 'Workspace parent folder path', '');
  await enterFieldValue(cdp, contextId, 'Workspace name', '');
  await enterFieldValue(cdp, contextId, 'Logic app name', '');
  await enterFieldValue(cdp, contextId, 'Workflow name', '');
  await assertNextButtonDisabled(cdp, contextId, 'standard progression: all required fields empty');

  await enterFieldValue(cdp, contextId, 'Workspace parent folder path', validPath);
  await waitForAsyncValidationToSettle(cdp, contextId);
  await assertNextButtonDisabled(cdp, contextId, 'standard progression: path only');

  await enterFieldValue(cdp, contextId, 'Workspace name', uniqueName('stdprogws'));
  await waitForAsyncValidationToSettle(cdp, contextId);
  await assertNextButtonDisabled(cdp, contextId, 'standard progression: path and workspace');

  await enterFieldValue(cdp, contextId, 'Logic app name', uniqueName('stdprogapp'));
  await waitForAsyncValidationToSettle(cdp, contextId);
  await assertNextButtonDisabled(cdp, contextId, 'standard progression: path, workspace, and app');

  await enterFieldValue(cdp, contextId, 'Workflow name', '!!!invalid');
  await waitForFieldValidationMessage(cdp, contextId, 'Workflow name', nameValidationMessage);
  await assertNextButtonDisabled(cdp, contextId, 'standard progression: invalid workflow name');

  await enterFieldValue(cdp, contextId, 'Workflow name', uniqueName('stdprogwf'));
  await waitForFieldValidationMessageToClear(cdp, contextId, 'Workflow name', nameValidationMessage);
  await selectDropdownOption(cdp, contextId, 'Workflow type', 'Stateful');
  await waitForAsyncValidationToSettle(cdp, contextId);
  await assertNextButtonEnabled(cdp, contextId, 'standard progression: all required fields valid');
}

async function runCustomCodeFieldValidationCases(cdp: CdpEvaluator, contextId: number, validPath: string): Promise<void> {
  await seedStandardFields(cdp, contextId, validPath);
  await selectRadioOption(cdp, contextId, 'Logic app with custom code');
  await waitForFieldVisible(cdp, contextId, ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']);
  await selectDropdownOption(cdp, contextId, '.NET Version', '.NET 8');

  const customCodeFolderLabels = ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name'];
  await runNameFieldCases(cdp, contextId, 'custom code folder name', customCodeFolderLabels, 'validfolder', [
    ['starts with number', '123folder', nameValidationMessage],
    ['matches logic app name', 'validapp', sameAsLogicAppValidationMessage],
    ['is empty', '', emptyValidationMessage],
    ['contains special characters', 'folder@name', nameValidationMessage],
    ['contains spaces', 'my folder', nameValidationMessage],
    ['starts with underscore', '_folder', nameValidationMessage],
    ['ends with hyphen', 'folder-', nameValidationMessage],
  ]);

  await runNameFieldCases(
    cdp,
    contextId,
    'custom code function namespace',
    ['Function namespace', 'Namespace', 'namespace'],
    'ValidNamespace',
    [
      ['starts with number', '123.Bad.Namespace', namespaceValidationMessage],
      ['contains hyphen', 'Invalid-Namespace', namespaceValidationMessage],
      ['is empty', '', emptyValidationMessage],
    ]
  );
  await enterFieldValue(cdp, contextId, ['Function namespace', 'Namespace', 'namespace'], 'MyCompany.Functions');
  await waitForFieldValidationMessageToClear(cdp, contextId, ['Function namespace', 'Namespace', 'namespace'], namespaceValidationMessage);

  await runNameFieldCases(cdp, contextId, 'custom code function name', 'Function name', 'validfn', [
    ['starts with number', '999func', nameValidationMessage],
    ['is empty', '', emptyValidationMessage],
    ['contains hyphen', 'my-func', nameValidationMessage],
    ['contains special characters', 'func@name', nameValidationMessage],
    ['contains spaces', 'my func', nameValidationMessage],
    ['contains dots', 'my.func', nameValidationMessage],
    ['starts with underscore', '_func', nameValidationMessage],
  ]);

  await runThreeRequiredFieldGatingCases(cdp, contextId, 'custom code fields', {
    first: { labels: customCodeFolderLabels, validValue: 'validfolder' },
    second: { labels: ['Function namespace', 'Namespace', 'namespace'], validValue: 'ValidNamespace' },
    third: { labels: 'Function name', validValue: 'validfn' },
  });
}

async function runRulesEngineFieldValidationCases(cdp: CdpEvaluator, contextId: number, validPath: string): Promise<void> {
  await seedStandardFields(cdp, contextId, validPath);
  await selectRadioOption(cdp, contextId, 'Logic app with rules engine');
  await waitForFieldVisible(cdp, contextId, ['Rules engine folder name', 'rules engine folder', 'Folder name']);

  const rulesEngineFolderLabels = ['Rules engine folder name', 'rules engine folder', 'Folder name'];
  await runNameFieldCases(cdp, contextId, 'rules engine folder name', rulesEngineFolderLabels, 'validrefolder', [
    ['starts with number', '123folder', nameValidationMessage],
    ['matches logic app name', 'validapp', sameAsLogicAppValidationMessage],
    ['is empty', '', emptyValidationMessage],
    ['contains special characters', 'folder@name', nameValidationMessage],
    ['contains spaces', 'my folder', nameValidationMessage],
    ['starts with underscore', '_folder', nameValidationMessage],
    ['ends with hyphen', 'folder-', nameValidationMessage],
  ]);

  await runNameFieldCases(
    cdp,
    contextId,
    'rules engine function namespace',
    ['Function namespace', 'Namespace', 'namespace'],
    'ValidNamespace',
    [
      ['contains hyphen', 'Invalid-Namespace', namespaceValidationMessage],
      ['starts with number', '123.Bad.Namespace', namespaceValidationMessage],
      ['is empty', '', emptyValidationMessage],
    ]
  );

  await runNameFieldCases(cdp, contextId, 'rules engine function name', 'Function name', 'validfn', [
    ['starts with number', '999func', nameValidationMessage],
    ['is empty', '', emptyValidationMessage],
    ['contains hyphen', 'my-func', nameValidationMessage],
    ['contains special characters', 'func@name', nameValidationMessage],
    ['contains spaces', 'my func', nameValidationMessage],
    ['contains dots', 'my.func', nameValidationMessage],
    ['starts with underscore', '_func', nameValidationMessage],
  ]);

  await runThreeRequiredFieldGatingCases(cdp, contextId, 'rules engine fields', {
    first: { labels: rulesEngineFolderLabels, validValue: 'validrefolder' },
    second: { labels: ['Function namespace', 'Namespace', 'namespace'], validValue: 'ValidNamespace' },
    third: { labels: 'Function name', validValue: 'validfn' },
  });
}

async function seedStandardFields(cdp: CdpEvaluator, contextId: number, validPath: string): Promise<void> {
  await enterFieldValue(cdp, contextId, 'Workspace parent folder path', validPath);
  await waitForAsyncValidationToSettle(cdp, contextId);
  await enterFieldValue(cdp, contextId, 'Workspace name', 'validws');
  await waitForAsyncValidationToSettle(cdp, contextId);
  await enterFieldValue(cdp, contextId, 'Logic app name', 'validapp');
  await selectRadioOption(cdp, contextId, 'Logic app (Standard)');
  await enterFieldValue(cdp, contextId, 'Workflow name', 'validwf');
  await selectDropdownOption(cdp, contextId, 'Workflow type', 'Stateful');
}

async function createWorkspaceThroughWebview(creationCase: WorkspaceCreationCase, parentPath: string): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const { cdp, contextId } = await openCreateWorkspaceContext();
    let submitted = false;
    try {
      await fillWorkspaceCreationFields(cdp, contextId, creationCase, parentPath);
      await assertNextButtonEnabled(cdp, contextId, `${creationCase.label} creation fields`);
      await clickWizardButton(cdp, contextId, 'Next');
      await waitForReviewStep(cdp, contextId, creationCase);
      await captureCliScreenshot(`create-workspace-${creationCase.label}-review`);
      submitted = true;
      await clickWizardButton(cdp, contextId, 'Create workspace');
      await waitForWorkspaceFile(parentPath, creationCase.wsName);
      await waitForWorkspaceArtifacts(parentPath, creationCase);
      return;
    } catch (error) {
      if (submitted || attempt === 2) {
        throw error;
      }

      lastError = error;
      console.warn(`[create-workspace-smoke] Retrying ${creationCase.label} creation after pre-submit webview failure: ${String(error)}`);
    } finally {
      cdp.dispose();
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

  const cdp = await connectToVsCodeCdp();
  const contextId = await waitForCreateWorkspaceFrameContext(cdp);
  return { cdp, contextId };
}

async function fillWorkspaceCreationFields(
  cdp: CdpEvaluator,
  contextId: number,
  creationCase: WorkspaceCreationCase,
  parentPath: string
): Promise<void> {
  await waitForFieldVisible(cdp, contextId, 'Workspace parent folder path');
  await enterFieldValue(cdp, contextId, 'Workspace parent folder path', parentPath);
  await waitForAsyncValidationToSettle(cdp, contextId);
  await waitForFieldVisible(cdp, contextId, 'Workspace name');
  await enterFieldValue(cdp, contextId, 'Workspace name', creationCase.wsName);
  await waitForAsyncValidationToSettle(cdp, contextId);
  await waitForFieldVisible(cdp, contextId, 'Logic app name');
  await enterFieldValue(cdp, contextId, 'Logic app name', creationCase.appName);
  await waitForFieldVisible(cdp, contextId, 'Workflow name');
  await enterFieldValue(cdp, contextId, 'Workflow name', creationCase.wfName);
  await selectDropdownOption(cdp, contextId, 'Workflow type', creationCase.workflowType);
  await selectRadioOption(cdp, contextId, creationCase.radioLabel);

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

  if (creationCase.appType !== 'codeful' && !(await isDropdownValueSelected(cdp, contextId, 'Workflow type', creationCase.workflowType))) {
    await selectDropdownOption(cdp, contextId, 'Workflow type', creationCase.workflowType);
  }

  await waitForAsyncValidationToSettle(cdp, contextId);
  await assertWorkspaceCreationFields(cdp, contextId, creationCase, parentPath);
  await captureWorkspaceCreationFormScreenshots(cdp, contextId, creationCase.label, 'fields-verified');
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
      await isDropdownValueSelected(cdp, contextId, 'Workflow type', creationCase.workflowType),
      `Expected ${creationCase.label} Workflow type dropdown to be ${creationCase.workflowType}`
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
    await captureCliScreenshot(`create-workspace-${label}-${stage}-${position}`);
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

async function clickWizardButton(cdp: CdpEvaluator, contextId: number, buttonText: string): Promise<void> {
  const clickResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; point?: Point }>(
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

async function assertInitialCreateWorkspaceContent(cdp: CdpEvaluator, contextId: number): Promise<void> {
  const pageText = await getPageText(cdp, contextId);
  const expectedText = [
    'Create logic app workspace',
    'Workspace parent folder path',
    'Workspace name',
    'Logic app name',
    'Logic app (Standard)',
    'Logic app (codeful)',
    'Logic app with custom code',
    'Logic app with rules engine',
    'Workflow name',
    'Workflow type',
    'Browse',
  ];

  for (const text of expectedText) {
    assert.ok(containsIgnoreCase(pageText, text), `Initial Create Workspace page should include "${text}". Text: ${pageText}`);
  }

  assert.ok(!containsIgnoreCase(pageText, 'Package path'), `Create Workspace flow should not show package path fields. Text: ${pageText}`);
  await assertNextButtonDisabled(cdp, contextId, 'initial form');
  await assertWizardButtonDisabledOrAbsent(cdp, contextId, 'Back', 'initial form');
  await assertDropdownHasOptions(cdp, contextId, 'Workflow type', [
    'Stateful',
    'Stateless',
    'Autonomous agents (Preview)',
    'Conversational agents (Preview)',
  ]);
}

async function goToReviewAndBack(cdp: CdpEvaluator, contextId: number, creationCase: WorkspaceCreationCase): Promise<void> {
  await clickWizardButton(cdp, contextId, 'Next');
  await waitForReviewStep(cdp, contextId, creationCase);
  await captureCliScreenshot(`create-workspace-${creationCase.label}-review-before-back`);
  await clickWizardButton(cdp, contextId, 'Back');
  await waitForFormStep(cdp, contextId, creationCase);
}

async function waitForFormStep(cdp: CdpEvaluator, contextId: number, creationCase: WorkspaceCreationCase): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const fieldState = await getFieldState(cdp, contextId, 'Workspace name').catch(() => undefined);
    if (fieldState?.value === creationCase.wsName) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const pageText = await getPageText(cdp, contextId);
  assert.fail(`Timed out waiting to return to ${creationCase.label} form step. Text: ${pageText}`);
}

async function verifyAppTypeCleanup(parentPath: string): Promise<void> {
  const { cdp, contextId } = await openCreateWorkspaceContext();
  try {
    const cleanupCase = createWorkspaceCase('cleanup-custom-code', 'customCode', 'Logic app with custom code', 'Stateful', 'clicleanup');
    await fillWorkspaceCreationFields(cdp, contextId, cleanupCase, parentPath);
    await selectRadioOption(cdp, contextId, 'Logic app (Standard)');
    await waitForFieldHidden(cdp, contextId, ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name']);
    await waitForFieldHidden(cdp, contextId, ['Function namespace', 'Namespace', 'namespace']);
    await waitForFieldHidden(cdp, contextId, 'Function name');
    await assertNextButtonEnabled(cdp, contextId, 'standard fields after custom-code cleanup');

    await selectRadioOption(cdp, contextId, 'Logic app with rules engine');
    await waitForFieldVisible(cdp, contextId, ['Rules engine folder name', 'rules engine folder', 'Folder name']);
    await selectRadioOption(cdp, contextId, 'Logic app (Standard)');
    await waitForFieldHidden(cdp, contextId, ['Rules engine folder name', 'rules engine folder', 'Folder name']);
    await assertNextButtonEnabled(cdp, contextId, 'standard fields after rules-engine cleanup');
    await captureCliScreenshot('create-workspace-app-type-cleanup');
  } finally {
    cdp.dispose();
  }
}

async function verifyWorkflowTypeDescriptionAndReview(parentPath: string): Promise<void> {
  const workflowTypeCases: Array<{ label: string; workflowType: WorkflowType; prefix: string; selectedTextFragment: string }> = [
    { label: 'workflow-type-stateless', workflowType: 'Stateless', prefix: 'cliwfsl', selectedTextFragment: 'Stateless' },
    {
      label: 'workflow-type-autonomous-agent',
      workflowType: 'Autonomous agents (Preview)',
      prefix: 'cliwfaa',
      selectedTextFragment: 'Autonomous',
    },
    {
      label: 'workflow-type-conversational-agent',
      workflowType: 'Conversational agents (Preview)',
      prefix: 'cliwfca',
      selectedTextFragment: 'Conversational',
    },
  ];

  for (const workflowTypeCase of workflowTypeCases) {
    const { cdp, contextId } = await openCreateWorkspaceContext();
    try {
      const creationCase = createWorkspaceCase(
        workflowTypeCase.label,
        'standard',
        'Logic app (Standard)',
        workflowTypeCase.workflowType,
        workflowTypeCase.prefix
      );
      await fillWorkspaceCreationFields(cdp, contextId, creationCase, parentPath);
      await assertSelectedWorkflowTypeDescriptionVisible(
        cdp,
        contextId,
        workflowTypeCase.workflowType,
        workflowTypeCase.selectedTextFragment
      );
      await clickWizardButton(cdp, contextId, 'Next');
      await waitForReviewStep(cdp, contextId, creationCase);
      await assertReviewContainsWorkflowType(cdp, contextId, creationCase.workflowType);
      await captureCliScreenshot(`create-workspace-${workflowTypeCase.label}-review`);
    } finally {
      cdp.dispose();
    }
  }
}

async function waitForReviewStep(cdp: CdpEvaluator, contextId: number, creationCase: WorkspaceCreationCase): Promise<void> {
  const expectedValues = [
    creationCase.wsName,
    creationCase.appName,
    creationCase.wfName,
    getReviewWorkflowTypeText(creationCase.workflowType),
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

async function assertSelectedWorkflowTypeDescriptionVisible(
  cdp: CdpEvaluator,
  contextId: number,
  workflowType: WorkflowType,
  selectedTextFragment: string
): Promise<void> {
  // ExTester's stable parity assertion is that the selected workflow type text is visible
  // on the setup form before moving to review; do not depend on layout-specific copy nodes.
  assert.ok(
    await isDropdownValueSelected(cdp, contextId, 'Workflow type', workflowType),
    `Expected Workflow type dropdown to show "${workflowType}"`
  );

  const pageText = await getPageText(cdp, contextId);
  assert.ok(
    containsIgnoreCase(pageText, selectedTextFragment),
    `Expected selected workflow type text containing "${selectedTextFragment}" to be visible before review. Text: ${pageText}`
  );
}

async function assertReviewContainsWorkflowType(cdp: CdpEvaluator, contextId: number, workflowType: WorkflowType): Promise<void> {
  const pageText = await getPageText(cdp, contextId);
  const reviewWorkflowTypeText = getReviewWorkflowTypeText(workflowType);
  assert.ok(
    containsIgnoreCase(pageText, reviewWorkflowTypeText),
    `Expected review step to include workflow type "${reviewWorkflowTypeText}" for "${workflowType}". Text: ${pageText}`
  );
}

function getReviewWorkflowTypeText(workflowType: WorkflowType): string {
  if (workflowType === 'Autonomous agents (Preview)') {
    return 'Autonomous';
  }

  if (workflowType === 'Conversational agents (Preview)') {
    return 'Conversational';
  }

  return workflowType;
}

async function waitForWorkspaceFile(parentPath: string, wsName: string): Promise<void> {
  const workspaceFilePath = path.join(parentPath, wsName, `${wsName}.code-workspace`);
  await waitForPathExists(workspaceFilePath, 45000);
}

async function waitForWorkspaceArtifacts(parentPath: string, creationCase: WorkspaceCreationCase): Promise<void> {
  const workspaceDir = path.join(parentPath, creationCase.wsName);
  const appDir = path.join(workspaceDir, creationCase.appName);
  await waitForPathExists(path.join(appDir, 'host.json'), 45000);
  await waitForPathExists(path.join(appDir, 'local.settings.json'), 45000);
  await waitForVsCodeArtifacts(appDir);

  if (creationCase.appType === 'codeful') {
    await waitForPathExists(path.join(appDir, `${creationCase.wfName}.cs`), 45000);
    await waitForPathExists(path.join(appDir, `${creationCase.appName}.csproj`), 45000);
    await waitForPathExists(path.join(appDir, 'Program.cs'), 45000);
    return;
  }

  await waitForPathExists(path.join(appDir, creationCase.wfName, 'workflow.json'), 45000);

  if (creationCase.appType === 'customCode' || creationCase.appType === 'rulesEngine') {
    const functionFolderName = requiredValue(creationCase.functionFolderName);
    const functionName = requiredValue(creationCase.functionName);
    const functionDir = path.join(workspaceDir, functionFolderName);
    await waitForPathExists(path.join(functionDir, `${functionName}.cs`), 45000);
    await waitForPathExists(path.join(functionDir, `${functionName}.csproj`), 45000);
    await waitForFunctionVsCodeArtifacts(functionDir);
  }

  if (creationCase.appType === 'rulesEngine') {
    await waitForPathExists(path.join(appDir, 'Artifacts', 'Rules', 'SampleRuleSet.xml'), 45000);
    await waitForPathExists(path.join(appDir, 'Artifacts', 'Schemas', 'SchemaUser.xsd'), 45000);
  }
}

async function waitForPathExists(filePath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const parentPath = path.dirname(filePath);
  const parentContents = fs.existsSync(parentPath) ? fs.readdirSync(parentPath) : ['(parent missing)'];
  assert.fail(`Timed out waiting for generated path ${filePath}. Parent contents: ${JSON.stringify(parentContents)}`);
}

function verifyCreatedWorkspace(parentPath: string, creationCase: WorkspaceCreationCase): void {
  const workspaceDir = path.join(parentPath, creationCase.wsName);
  const workspaceFilePath = path.join(workspaceDir, `${creationCase.wsName}.code-workspace`);
  const appDir = path.join(workspaceDir, creationCase.appName);
  const workflowJsonPath = path.join(appDir, creationCase.wfName, 'workflow.json');

  assert.ok(fs.existsSync(workspaceDir), `Workspace directory should exist: ${workspaceDir}`);
  assert.ok(fs.existsSync(workspaceFilePath), `.code-workspace file should exist: ${workspaceFilePath}`);
  assert.ok(fs.existsSync(appDir), `Logic app directory should exist: ${appDir}`);
  assert.ok(fs.existsSync(path.join(appDir, 'host.json')), `host.json should exist under ${appDir}`);
  assert.ok(fs.existsSync(path.join(appDir, 'local.settings.json')), `local.settings.json should exist under ${appDir}`);
  verifyLogicAppVsCodeArtifacts(appDir, creationCase);

  const workspaceContent = readJsonFile<WorkspaceJson>(workspaceFilePath);
  const folderNames = (workspaceContent.folders ?? []).map((folder) => folder.name);
  assert.ok(folderNames.includes(creationCase.appName), `.code-workspace should include logic app folder ${creationCase.appName}`);
  assertWorkspaceFolderPath(workspaceFilePath, workspaceContent, creationCase.appName, appDir, creationCase);

  if (creationCase.appType === 'codeful') {
    verifyCodefulProject(appDir, creationCase);
    assert.ok(!fs.existsSync(workflowJsonPath), `Codeful workspace should not generate codeless workflow.json: ${workflowJsonPath}`);
    return;
  }

  assert.ok(fs.existsSync(workflowJsonPath), `workflow.json should exist: ${workflowJsonPath}`);
  const workflowJson = JSON.parse(fs.readFileSync(workflowJsonPath, 'utf-8')) as WorkflowJson;
  assert.strictEqual(
    workflowJson.kind,
    getExpectedWorkflowKind(creationCase.workflowType),
    `${creationCase.label} workflow kind should match ${creationCase.workflowType}`
  );

  verifyWorkflowDefinitionShape(workflowJson, creationCase);

  if (creationCase.appType === 'customCode') {
    verifyFunctionProject(workspaceDir, creationCase, workspaceContent);
  } else if (creationCase.appType === 'rulesEngine') {
    verifyFunctionProject(workspaceDir, creationCase, workspaceContent);
    assert.ok(
      fs.existsSync(path.join(appDir, 'Artifacts', 'Rules', 'SampleRuleSet.xml')),
      'Rules engine workspace should include Artifacts\\Rules\\SampleRuleSet.xml'
    );
    assert.ok(
      fs.existsSync(path.join(appDir, 'Artifacts', 'Schemas', 'SchemaUser.xsd')),
      'Rules engine workspace should include Artifacts\\Schemas\\SchemaUser.xsd'
    );
  }
}

function assertWorkspaceFolderPath(
  workspaceFilePath: string,
  workspaceContent: WorkspaceJson,
  folderName: string,
  expectedPath: string,
  creationCase: WorkspaceCreationCase
): void {
  const folder = (workspaceContent.folders ?? []).find((candidate) => candidate.name === folderName);
  assert.ok(folder, `${creationCase.label} .code-workspace should include folder ${folderName}`);
  assert.strictEqual(typeof folder.path, 'string', `${creationCase.label} .code-workspace folder ${folderName} should include a path`);

  const folderPath = folder.path;
  assert.ok(folderPath, `${creationCase.label} .code-workspace folder ${folderName} should include a non-empty path`);
  const actualPath = path.resolve(path.dirname(workspaceFilePath), folderPath);
  assert.strictEqual(
    actualPath.toLowerCase(),
    expectedPath.toLowerCase(),
    `${creationCase.label} .code-workspace folder ${folderName} should resolve to ${expectedPath}`
  );
}

function getFixtureManifestPath(): string {
  return process.env.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST ?? path.join(os.tmpdir(), 'la-e2e-test', 'created-workspaces.json');
}

function clearFixtureManifest(): void {
  const manifestPath = getFixtureManifestPath();
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
    console.log(`[create-workspace-fixtures] Cleared stale manifest at ${manifestPath}`);
  }
}

function buildWorkspaceManifestEntry(parentPath: string, creationCase: WorkspaceCreationCase): WorkspaceManifestEntry {
  const wsDir = path.join(parentPath, creationCase.wsName);
  const appDir = path.join(wsDir, creationCase.appName);
  const entry: WorkspaceManifestEntry = {
    label: getFixtureManifestLabel(creationCase),
    parentDir: parentPath,
    wsName: creationCase.wsName,
    appName: creationCase.appName,
    wfName: creationCase.wfName,
    appType: creationCase.appType,
    wfType: creationCase.workflowType,
    wsDir,
    wsFilePath: path.join(wsDir, `${creationCase.wsName}.code-workspace`),
    appDir,
    wfDir: path.join(appDir, creationCase.wfName),
    createdAt: new Date().toISOString(),
  };

  if (creationCase.functionFolderName) {
    entry.ccFolderName = creationCase.functionFolderName;
  }
  if (creationCase.functionName) {
    entry.fnName = creationCase.functionName;
  }
  if (creationCase.functionNamespace) {
    entry.fnNamespace = creationCase.functionNamespace;
  }

  return entry;
}

function getFixtureManifestLabel(creationCase: WorkspaceCreationCase): string {
  if (creationCase.appType === 'standard') {
    return `Standard + ${creationCase.workflowType}`;
  }
  if (creationCase.appType === 'customCode') {
    return `CustomCode + ${creationCase.workflowType}`;
  }
  if (creationCase.appType === 'rulesEngine') {
    return `RulesEngine + ${creationCase.workflowType}`;
  }

  return `Codeful + ${creationCase.workflowType}`;
}

function writeFixtureManifest(entries: WorkspaceManifestEntry[]): void {
  const manifestPath = getFixtureManifestPath();
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf-8');
  console.log(`[create-workspace-fixtures] Wrote ${entries.length} manifest entries to ${manifestPath}`);
}

async function waitForVsCodeArtifacts(projectDir: string): Promise<void> {
  const vscodeDir = path.join(projectDir, '.vscode');
  await waitForPathExists(path.join(vscodeDir, 'settings.json'), 45000);
  await waitForPathExists(path.join(vscodeDir, 'extensions.json'), 45000);
  await waitForPathExists(path.join(vscodeDir, 'tasks.json'), 45000);
  await waitForPathExists(path.join(vscodeDir, 'launch.json'), 45000);
}

async function waitForFunctionVsCodeArtifacts(functionDir: string): Promise<void> {
  const vscodeDir = path.join(functionDir, '.vscode');
  await waitForPathExists(path.join(vscodeDir, 'settings.json'), 45000);
  await waitForPathExists(path.join(vscodeDir, 'extensions.json'), 45000);
  await waitForPathExists(path.join(vscodeDir, 'tasks.json'), 45000);
}

function verifyLogicAppVsCodeArtifacts(appDir: string, creationCase: WorkspaceCreationCase): void {
  const vscodeDir = path.join(appDir, '.vscode');
  for (const fileName of ['settings.json', 'extensions.json', 'tasks.json', 'launch.json']) {
    assert.ok(fs.existsSync(path.join(vscodeDir, fileName)), `${creationCase.label} should generate .vscode/${fileName}`);
  }

  const settings = readJsonFile<Record<string, unknown>>(path.join(vscodeDir, 'settings.json'));
  const extensions = readJsonFile<ExtensionsJson>(path.join(vscodeDir, 'extensions.json'));
  const tasks = readJsonFile<TasksJson>(path.join(vscodeDir, 'tasks.json'));
  const launch = readJsonFile<LaunchJson>(path.join(vscodeDir, 'launch.json'));

  verifyLogicAppSettings(settings, creationCase);
  verifyLogicAppExtensionRecommendations(extensions, creationCase);
  verifyLogicAppTasks(tasks, creationCase);
  verifyLogicAppLaunch(launch, creationCase);
}

function verifyLogicAppSettings(settings: Record<string, unknown>, creationCase: WorkspaceCreationCase): void {
  const expectedLanguage = creationCase.appType === 'codeful' ? 'C#' : 'JavaScript';
  assert.strictEqual(
    settings[logicAppsProjectLanguageSetting],
    expectedLanguage,
    `${creationCase.label} settings should set Logic Apps project language`
  );
  assert.strictEqual(settings[logicAppsProjectRuntimeSetting], '~4', `${creationCase.label} settings should set Functions runtime ~4`);
  assert.strictEqual(
    settings['debug.internalConsoleOptions'],
    'neverOpen',
    `${creationCase.label} settings should suppress debug console auto-open`
  );
  assert.strictEqual(
    settings['azureFunctions.suppressProject'],
    true,
    `${creationCase.label} settings should suppress Azure Functions project prompts`
  );

  if (creationCase.appType === 'standard' || creationCase.appType === 'codeful') {
    assert.strictEqual(settings[logicAppsDeploySubpathSetting], '.', `${creationCase.label} settings should deploy from the project root`);
  }

  if (creationCase.appType === 'codeful') {
    assert.strictEqual(
      settings['omnisharp.enableMsBuildLoadProjectsOnDemand'],
      false,
      `${creationCase.label} settings should disable OmniSharp on-demand project loading`
    );
    assert.strictEqual(
      settings['omnisharp.disableMSBuildDiagnosticWarning'],
      true,
      `${creationCase.label} settings should suppress OmniSharp MSBuild diagnostics`
    );
  }
}

function verifyLogicAppExtensionRecommendations(extensions: ExtensionsJson, creationCase: WorkspaceCreationCase): void {
  assertRecommendations(
    extensions,
    [logicAppsExtensionId, dotnetExtensionId, functionsExtensionId, csDevKitExtensionId],
    `${creationCase.label} .vscode/extensions.json`
  );
}

function verifyLogicAppLaunch(launch: LaunchJson, creationCase: WorkspaceCreationCase): void {
  assert.strictEqual(launch.version, '0.2.0', `${creationCase.label} launch.json should use VS Code launch schema 0.2.0`);
  const configurations = assertRecordArray<LaunchConfiguration>(launch.configurations, `${creationCase.label} launch.json configurations`);
  assert.strictEqual(configurations.length, 1, `${creationCase.label} launch.json should contain one generated debug configuration`);
  const configuration = configurations[0];
  assert.ok(configuration, `${creationCase.label} launch.json should include a debug configuration`);

  if (creationCase.appType === 'standard') {
    assert.strictEqual(
      configuration.name,
      `Run/Debug logic app ${creationCase.appName}`,
      `${creationCase.label} launch config should target the generated Logic App`
    );
    assert.strictEqual(configuration.type, 'coreclr', `${creationCase.label} launch config should attach to the Functions host`);
    assert.strictEqual(configuration.request, 'attach', `${creationCase.label} launch config should use attach request`);
    assert.strictEqual(
      configuration.processId,
      `\${command:${logicAppsPickProcessCommand}}`,
      `${creationCase.label} launch config should use the Logic Apps process picker`
    );
    return;
  }

  if (creationCase.appType === 'codeful') {
    assert.strictEqual(
      configuration.name,
      `Run/Debug logic app ${creationCase.appName}`,
      `${creationCase.label} launch config should target the generated codeful Logic App`
    );
    assert.strictEqual(configuration.type, 'logicapp', `${creationCase.label} launch config should use the Logic Apps debug adapter`);
    assert.strictEqual(configuration.request, 'launch', `${creationCase.label} launch config should use launch request`);
    assert.strictEqual(configuration.funcRuntime, 'coreclr', `${creationCase.label} launch config should use coreclr Functions runtime`);
    assert.strictEqual(configuration.isCodeless, false, `${creationCase.label} launch config should identify codeful projects`);
    assert.strictEqual(
      configuration.customCodeRuntime,
      undefined,
      `${creationCase.label} codeful launch config should not include a customCodeRuntime`
    );
    return;
  }

  assert.strictEqual(
    configuration.name,
    `Run/Debug logic app with local function ${creationCase.appName}`,
    `${creationCase.label} launch config should target the generated Logic App with local function`
  );
  assert.strictEqual(configuration.type, 'logicapp', `${creationCase.label} launch config should use the Logic Apps debug adapter`);
  assert.strictEqual(configuration.request, 'launch', `${creationCase.label} launch config should use launch request`);
  assert.strictEqual(configuration.funcRuntime, 'coreclr', `${creationCase.label} launch config should use coreclr Functions runtime`);
  assert.strictEqual(configuration.isCodeless, true, `${creationCase.label} launch config should identify codeless projects`);
  assert.strictEqual(
    typeof configuration.customCodeRuntime,
    'string',
    `${creationCase.label} launch config should include the local function runtime`
  );
}

function verifyLogicAppTasks(tasksJson: TasksJson, creationCase: WorkspaceCreationCase): void {
  assert.strictEqual(tasksJson.version, '2.0.0', `${creationCase.label} tasks.json should use VS Code tasks schema 2.0.0`);
  const tasks = assertRecordArray<TaskJson>(tasksJson.tasks, `${creationCase.label} tasks.json tasks`);

  if (creationCase.appType === 'codeful') {
    assertTaskLabels(tasks, ['clean', 'build', 'clean release', 'publish', funcHostStartTaskLabel], creationCase);
    assert.ok(
      !tasks.some((task) => task.label === 'generateDebugSymbols'),
      `${creationCase.label} codeful tasks should not include bundle debug symbol generation`
    );
    assert.strictEqual(tasksJson.inputs, undefined, `${creationCase.label} codeful tasks should not include bundle debug symbol inputs`);
    verifyDotnetBuildTaskChain(tasks, creationCase);
    verifyFuncHostStartTask(requiredTask(tasks, funcHostStartTaskLabel, creationCase), creationCase, { expectedDependsOn: 'build' });
    return;
  }

  assertTaskLabels(tasks, ['generateDebugSymbols', funcHostStartTaskLabel], creationCase);
  verifyDebugSymbolsTask(requiredTask(tasks, 'generateDebugSymbols', creationCase), creationCase);
  verifyDebugSymbolsInput(tasksJson.inputs, creationCase);
  verifyFuncHostStartTask(requiredTask(tasks, funcHostStartTaskLabel, creationCase), creationCase, { expectedDependsOn: undefined });
}

function assertTaskLabels(tasks: TaskJson[], expectedLabels: string[], creationCase: WorkspaceCreationCase): void {
  const actualLabels = tasks.map((task) => task.label);
  assert.deepStrictEqual(
    [...actualLabels].sort(),
    [...expectedLabels].sort(),
    `${creationCase.label} should generate the stable task label set`
  );
}

function verifyDebugSymbolsTask(task: TaskJson, creationCase: WorkspaceCreationCase): void {
  assert.strictEqual(task.type, 'process', `${creationCase.label} generateDebugSymbols should be a process task`);
  assert.strictEqual(task.command, dotnetBinaryPathSetting, `${creationCase.label} generateDebugSymbols should use configured dotnet`);
  assert.deepStrictEqual(
    task.args,
    ['${input:getDebugSymbolDll}'],
    `${creationCase.label} generateDebugSymbols should resolve the DLL through input`
  );
  assert.strictEqual(task.problemMatcher, '$msCompile', `${creationCase.label} generateDebugSymbols should use the C# problem matcher`);
}

function verifyDebugSymbolsInput(inputs: unknown, creationCase: WorkspaceCreationCase): void {
  const inputList = assertRecordArray(inputs, `${creationCase.label} tasks.json inputs`);
  assert.deepStrictEqual(
    inputList,
    [{ id: 'getDebugSymbolDll', type: 'command', command: logicAppsGetDebugSymbolDllCommand }],
    `${creationCase.label} tasks.json should resolve debug-symbol DLLs through the Logic Apps command input`
  );
}

function verifyDotnetBuildTaskChain(tasks: TaskJson[], creationCase: WorkspaceCreationCase): void {
  const clean = requiredTask(tasks, 'clean', creationCase);
  assert.strictEqual(clean.type, 'process', `${creationCase.label} clean task should be a process task`);
  assert.strictEqual(clean.command, dotnetBinaryPathSetting, `${creationCase.label} clean task should use configured dotnet`);
  assert.deepStrictEqual(clean.args, ['clean', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
  assert.strictEqual(clean.problemMatcher, '$msCompile', `${creationCase.label} clean task should use the C# problem matcher`);

  const build = requiredTask(tasks, 'build', creationCase);
  assert.strictEqual(build.type, 'process', `${creationCase.label} build task should be a process task`);
  assert.strictEqual(build.command, dotnetBinaryPathSetting, `${creationCase.label} build task should use configured dotnet`);
  assert.deepStrictEqual(build.args, ['build', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
  assert.strictEqual(build.dependsOn, 'clean', `${creationCase.label} build task should depend on clean`);
  assert.deepStrictEqual(build.group, { kind: 'build', isDefault: true }, `${creationCase.label} build task should be the default build`);
  assert.strictEqual(build.problemMatcher, '$msCompile', `${creationCase.label} build task should use the C# problem matcher`);

  const cleanRelease = requiredTask(tasks, 'clean release', creationCase);
  assert.strictEqual(cleanRelease.type, 'process', `${creationCase.label} clean release task should be a process task`);
  assert.strictEqual(
    cleanRelease.command,
    dotnetBinaryPathSetting,
    `${creationCase.label} clean release task should use configured dotnet`
  );
  assert.deepStrictEqual(cleanRelease.args, [
    'clean',
    '--configuration',
    'Release',
    '/property:GenerateFullPaths=true',
    '/consoleloggerparameters:NoSummary',
  ]);
  assert.strictEqual(
    cleanRelease.problemMatcher,
    '$msCompile',
    `${creationCase.label} clean release task should use the C# problem matcher`
  );

  const publish = requiredTask(tasks, 'publish', creationCase);
  assert.strictEqual(publish.type, 'process', `${creationCase.label} publish task should be a process task`);
  assert.strictEqual(publish.command, dotnetBinaryPathSetting, `${creationCase.label} publish task should use configured dotnet`);
  assert.deepStrictEqual(publish.args, [
    'publish',
    '--configuration',
    'Release',
    '/property:GenerateFullPaths=true',
    '/consoleloggerparameters:NoSummary',
  ]);
  assert.strictEqual(publish.dependsOn, 'clean release', `${creationCase.label} publish task should depend on clean release`);
  assert.strictEqual(publish.problemMatcher, '$msCompile', `${creationCase.label} publish task should use the C# problem matcher`);
}

function verifyFuncHostStartTask(
  task: TaskJson,
  creationCase: WorkspaceCreationCase,
  options: { expectedDependsOn: string | undefined }
): void {
  assert.strictEqual(task.problemMatcher, funcWatchProblemMatcher, `${creationCase.label} func host task should use $func-watch`);
  assert.strictEqual(task.isBackground, true, `${creationCase.label} func host task should be backgrounded`);
  assert.strictEqual(
    task.dependsOn,
    options.expectedDependsOn,
    `${creationCase.label} func host task dependency should match project shape`
  );

  if (creationCase.appType === 'codeful') {
    assert.strictEqual(task.group, undefined, `${creationCase.label} func host task should not be the default build task`);
  } else {
    assert.deepStrictEqual(
      task.group,
      { kind: 'build', isDefault: true },
      `${creationCase.label} func host task should be the default build task`
    );
  }

  if (task.type === 'shell') {
    assert.strictEqual(
      task.command,
      funcCoreToolsBinaryPathSetting,
      `${creationCase.label} func host shell task should use configured func path`
    );
    assert.deepStrictEqual(task.args, ['host', 'start'], `${creationCase.label} func host shell task should pass stable host start args`);
    assertPlatformFuncTaskEnv(task, creationCase);
    return;
  }

  assert.strictEqual(
    task.type,
    'func',
    `${creationCase.label} func host task should be shell when managed binaries exist or func otherwise`
  );
  assert.strictEqual(task.command, 'host start', `${creationCase.label} func host fallback task should use the stable host start command`);
  assert.strictEqual(task.args, undefined, `${creationCase.label} func host fallback task should not duplicate host start args`);
}

function assertPlatformFuncTaskEnv(task: TaskJson, creationCase: WorkspaceCreationCase): void {
  const platformBlocks = [
    ['windows', '\\NodeJs;', '\\DotNetSDK;', '${env:PATH}'],
    ['linux', '/NodeJs:', '/DotNetSDK:', '${env:PATH}'],
    ['osx', '/NodeJs:', '/DotNetSDK:', '${env:PATH}'],
  ] as const;

  for (const [platform, nodeSegment, dotnetSegment, inheritedPath] of platformBlocks) {
    const platformBlock = assertRecord(task[platform], `${creationCase.label} func host ${platform} override`);
    const options = assertRecord(platformBlock.options, `${creationCase.label} func host ${platform} options`);
    const env = assertRecord(options.env, `${creationCase.label} func host ${platform} env`);
    const pathValue = env.PATH;
    assert.ok(typeof pathValue === 'string', `${creationCase.label} func host ${platform} PATH should be a string`);
    assert.ok(pathValue.includes(nodeSegment), `${creationCase.label} func host ${platform} PATH should include managed NodeJs`);
    assert.ok(pathValue.includes(dotnetSegment), `${creationCase.label} func host ${platform} PATH should include managed DotNetSDK`);
    assert.ok(pathValue.includes(inheritedPath), `${creationCase.label} func host ${platform} PATH should preserve inherited PATH`);
  }
}

function assertWorkspaceManifestEntry(entry: WorkspaceManifestEntry): void {
  assert.ok(fs.existsSync(entry.wsDir), `Manifest wsDir should exist: ${entry.wsDir}`);
  assert.ok(fs.existsSync(entry.wsFilePath), `Manifest wsFilePath should exist: ${entry.wsFilePath}`);
  assert.ok(fs.existsSync(entry.appDir), `Manifest appDir should exist: ${entry.appDir}`);
  assert.ok(fs.existsSync(entry.wfDir), `Manifest wfDir should exist: ${entry.wfDir}`);

  const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
  const workflowJson = JSON.parse(fs.readFileSync(workflowJsonPath, 'utf-8')) as { kind?: string };
  assert.strictEqual(workflowJson.kind, getExpectedWorkflowKind(entry.wfType), `${entry.label} manifest workflow kind should match`);
}

function assertFixtureManifestComplete(entries: WorkspaceManifestEntry[], caseFilter: string | undefined): void {
  const manifestPath = getFixtureManifestPath();
  assert.ok(fs.existsSync(manifestPath), `Fixture manifest should exist: ${manifestPath}`);

  const writtenEntries = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as WorkspaceManifestEntry[];
  assert.strictEqual(writtenEntries.length, entries.length, 'Fixture manifest should contain the entries created in this run');
  if (caseFilter) {
    assert.ok(writtenEntries.length > 0, `Filtered fixture manifest run should create at least one entry. Filter=${caseFilter}`);
    return;
  }

  for (const expected of [
    ['standard', 'Stateful'],
    ['standard', 'Stateless'],
    ['customCode', 'Stateful'],
    ['rulesEngine', 'Stateful'],
  ] as const) {
    assert.ok(
      writtenEntries.some((entry) => entry.appType === expected[0] && entry.wfType === expected[1]),
      `Fixture manifest should include ${expected[0]} ${expected[1]}`
    );
  }
}

function verifyWorkflowDefinitionShape(workflowJson: WorkflowJson, creationCase: WorkspaceCreationCase): void {
  assert.ok(workflowJson.definition, `${creationCase.label} workflow.json should include a definition`);
  assert.strictEqual(workflowJson.definition.contentVersion, '1.0.0.0', `${creationCase.label} contentVersion should be deterministic`);
  assert.deepStrictEqual(
    workflowJson.definition.outputs ?? {},
    {},
    `${creationCase.label} generated workflow should start with no outputs`
  );

  const actions = workflowJson.definition.actions ?? {};
  const triggers = workflowJson.definition.triggers ?? {};

  if (creationCase.appType === 'standard') {
    verifyStandardWorkflowDefinition(actions, triggers, creationCase);
    return;
  }

  if (creationCase.appType === 'customCode') {
    verifyCustomCodeWorkflowDefinition(actions, triggers, creationCase);
    return;
  }

  if (creationCase.appType === 'rulesEngine') {
    verifyRulesEngineWorkflowDefinition(actions, triggers, creationCase);
  }
}

function verifyStandardWorkflowDefinition(
  actions: Record<string, WorkflowAction>,
  triggers: Record<string, WorkflowTrigger>,
  creationCase: WorkspaceCreationCase
): void {
  if (creationCase.workflowType === 'Autonomous agents (Preview)') {
    const agentAction = requiredAction(actions, 'Default_Agent', creationCase);
    assert.strictEqual(agentAction.type, 'Agent', `${creationCase.label} Default_Agent action should be an Agent action`);
    assert.deepStrictEqual(agentAction.runAfter ?? {}, {}, `${creationCase.label} autonomous agent should not run after a chat trigger`);
    assert.ok(isRecord(agentAction.inputs?.parameters), `${creationCase.label} Default_Agent should include parameter inputs`);
    assert.strictEqual(
      agentAction.inputs?.parameters?.agentModelType,
      'AzureOpenAI',
      `${creationCase.label} Default_Agent should keep the expected default model type`
    );
    assert.ok(isRecord(agentAction.inputs?.modelConfigurations), `${creationCase.label} Default_Agent should include model configurations`);
    assert.deepStrictEqual(triggers, {}, `${creationCase.label} autonomous agent workflow should not include generated triggers`);
    assert.deepStrictEqual(
      Object.keys(actions).sort(),
      ['Default_Agent'],
      `${creationCase.label} autonomous agent should only include Default_Agent`
    );
    return;
  }

  if (creationCase.workflowType === 'Conversational agents (Preview)') {
    const chatTrigger = requiredTrigger(triggers, 'When_a_new_chat_session_starts', creationCase);
    assert.strictEqual(chatTrigger.type, 'Request', `${creationCase.label} chat trigger should be a Request trigger`);
    assert.strictEqual(chatTrigger.kind, 'Agent', `${creationCase.label} chat trigger should use Agent kind`);

    const agentAction = requiredAction(actions, 'Default_Agent', creationCase);
    assert.strictEqual(agentAction.type, 'Agent', `${creationCase.label} Default_Agent action should be an Agent action`);
    assert.deepStrictEqual(
      agentAction.runAfter?.When_a_new_chat_session_starts,
      ['Succeeded'],
      `${creationCase.label} Default_Agent should run after the chat-session trigger`
    );
    assert.deepStrictEqual(
      Object.keys(triggers).sort(),
      ['When_a_new_chat_session_starts'],
      `${creationCase.label} conversational agent should only include the chat-session trigger`
    );
    assert.deepStrictEqual(
      Object.keys(actions).sort(),
      ['Default_Agent'],
      `${creationCase.label} conversational agent should only include Default_Agent`
    );
    return;
  }

  assert.deepStrictEqual(actions, {}, `${creationCase.label} Standard ${creationCase.workflowType} workflow should start with no actions`);
  assert.deepStrictEqual(
    triggers,
    {},
    `${creationCase.label} Standard ${creationCase.workflowType} workflow should start with no triggers`
  );
}

function verifyCustomCodeWorkflowDefinition(
  actions: Record<string, WorkflowAction>,
  triggers: Record<string, WorkflowTrigger>,
  creationCase: WorkspaceCreationCase
): void {
  // Preview selections for custom-code currently reuse the custom-code starter workflow.
  // The stable preview distinction for this app type is the top-level workflow kind,
  // while the action/trigger contract remains the local-function template below.
  const actionName = 'Call_a_local_function_in_this_logic_app';
  const invokeAction = requiredAction(actions, actionName, creationCase);
  assert.strictEqual(invokeAction.type, 'InvokeFunction', `${creationCase.label} should invoke the generated local function`);
  assert.strictEqual(
    invokeAction.inputs?.functionName,
    requiredValue(creationCase.functionName),
    `${creationCase.label} InvokeFunction action should target the generated function`
  );
  assert.deepStrictEqual(
    invokeAction.inputs?.parameters,
    { temperatureScale: 'Celsius', zipCode: 85396 },
    `${creationCase.label} InvokeFunction parameters should match the custom-code starter template`
  );

  verifyHttpRequestTrigger(triggers, creationCase);
  verifyResponseAfterAction(actions, actionName, creationCase);
  assert.deepStrictEqual(
    Object.keys(actions).sort(),
    [actionName, 'Response'].sort(),
    `${creationCase.label} custom-code workflow should include only InvokeFunction and Response actions`
  );
}

function verifyRulesEngineWorkflowDefinition(
  actions: Record<string, WorkflowAction>,
  triggers: Record<string, WorkflowTrigger>,
  creationCase: WorkspaceCreationCase
): void {
  // Preview selections for rules-engine currently reuse the rules starter workflow.
  // The stable preview distinction for this app type is the top-level workflow kind,
  // while the action/trigger contract remains the local-rules-function template below.
  const actionName = 'Call_a_local_rules_function_in_this_logic_app';
  const invokeAction = requiredAction(actions, actionName, creationCase);
  assert.strictEqual(invokeAction.type, 'InvokeFunction', `${creationCase.label} should invoke the generated local rules function`);
  assert.strictEqual(
    invokeAction.inputs?.functionName,
    requiredValue(creationCase.functionName),
    `${creationCase.label} rules InvokeFunction action should target the generated function`
  );
  assert.strictEqual(
    invokeAction.inputs?.parameters?.ruleSetName,
    'SampleRuleSet',
    `${creationCase.label} rules action should target the sample rule set`
  );
  assert.strictEqual(
    invokeAction.inputs?.parameters?.documentType,
    'SchemaUser',
    `${creationCase.label} rules action should target the sample schema`
  );
  assert.strictEqual(
    typeof invokeAction.inputs?.parameters?.inputXml,
    'string',
    `${creationCase.label} rules action should include XML input`
  );
  assert.ok(
    Object.hasOwn(invokeAction.inputs?.parameters ?? {}, 'purchaseAmount'),
    `${creationCase.label} rules action should include purchaseAmount`
  );
  assert.ok(Object.hasOwn(invokeAction.inputs?.parameters ?? {}, 'zipCode'), `${creationCase.label} rules action should include zipCode`);

  verifyHttpRequestTrigger(triggers, creationCase);
  verifyResponseAfterAction(actions, actionName, creationCase);
  assert.deepStrictEqual(
    Object.keys(actions).sort(),
    [actionName, 'Response'].sort(),
    `${creationCase.label} rules-engine workflow should include only InvokeFunction and Response actions`
  );
}

function verifyHttpRequestTrigger(triggers: Record<string, WorkflowTrigger>, creationCase: WorkspaceCreationCase): void {
  const trigger = requiredTrigger(triggers, 'When_a_HTTP_request_is_received', creationCase);
  assert.strictEqual(trigger.type, 'Request', `${creationCase.label} starter workflow should include an HTTP Request trigger`);
  assert.strictEqual(trigger.kind, 'Http', `${creationCase.label} starter workflow should include an HTTP trigger kind`);
  assert.deepStrictEqual(
    Object.keys(triggers).sort(),
    ['When_a_HTTP_request_is_received'],
    `${creationCase.label} starter workflow should only include the generated HTTP trigger`
  );
}

function verifyResponseAfterAction(actions: Record<string, WorkflowAction>, actionName: string, creationCase: WorkspaceCreationCase): void {
  const responseAction = requiredAction(actions, 'Response', creationCase);
  assert.strictEqual(responseAction.type, 'Response', `${creationCase.label} should include a Response action`);
  assert.strictEqual(responseAction.kind, 'http', `${creationCase.label} Response action should use http kind`);
  assert.strictEqual(responseAction.inputs?.statusCode, 200, `${creationCase.label} Response action should return HTTP 200`);
  assert.strictEqual(
    responseAction.inputs?.body,
    `@body('${actionName}')`,
    `${creationCase.label} Response action should return the InvokeFunction body`
  );
  assert.deepStrictEqual(
    responseAction.runAfter?.[actionName],
    ['Succeeded'],
    `${creationCase.label} Response action should run after ${actionName}`
  );
}

function requiredAction(actions: Record<string, WorkflowAction>, actionName: string, creationCase: WorkspaceCreationCase): WorkflowAction {
  assert.ok(
    actions[actionName],
    `${creationCase.label} workflow should include ${actionName}. Actions: ${JSON.stringify(Object.keys(actions))}`
  );
  return actions[actionName];
}

function requiredTrigger(
  triggers: Record<string, WorkflowTrigger>,
  triggerName: string,
  creationCase: WorkspaceCreationCase
): WorkflowTrigger {
  assert.ok(
    triggers[triggerName],
    `${creationCase.label} workflow should include ${triggerName}. Triggers: ${JSON.stringify(Object.keys(triggers))}`
  );
  return triggers[triggerName];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function applyCodefulControlVariant(parentPath: string, creationCase: WorkspaceCreationCase): void {
  if (creationCase.appType !== 'codeful' || creationCase.codefulControlVariant !== 'legacy-control') {
    return;
  }

  const appDir = path.join(parentPath, creationCase.wsName, creationCase.appName);
  const csprojPath = getCodefulCsprojPath(appDir);
  let csprojContent = fs.readFileSync(csprojPath, 'utf-8');

  for (const targetName of ['CopyToCodefulFolder', 'ReplaceLanguageNetCore']) {
    const targetMatch = csprojContent.match(new RegExp(`<Target\\b[^>]*Name=["']${targetName}["'][^>]*>`));
    assert.ok(targetMatch, `Legacy-control codeful case should find ${targetName} target in ${csprojPath}`);

    const targetTag = targetMatch[0];
    const updatedTargetTag = targetTag.replace(/(AfterTargets=["'])Build;Publish(["'])/, '$1Publish$2');
    assert.notStrictEqual(
      updatedTargetTag,
      targetTag,
      `Legacy-control codeful case should patch ${targetName} AfterTargets in ${csprojPath}`
    );
    csprojContent = csprojContent.replace(targetTag, updatedTargetTag);
  }

  fs.writeFileSync(csprojPath, csprojContent, 'utf-8');
}

function verifyCodefulProject(appDir: string, creationCase: WorkspaceCreationCase): void {
  for (const fileName of [
    `${creationCase.wfName}.cs`,
    `${creationCase.appName}.csproj`,
    'Program.cs',
    'host.json',
    'local.settings.json',
  ]) {
    const filePath = path.join(appDir, fileName);
    assert.ok(fs.existsSync(filePath), `Codeful workspace should include ${fileName}: ${filePath}`);
  }

  const localSettingsPath = path.join(appDir, 'local.settings.json');
  const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8')) as { Values?: Record<string, string> };
  assert.strictEqual(
    localSettings.Values?.WORKFLOW_CODEFUL_ENABLED,
    'true',
    `Codeful workspace should set WORKFLOW_CODEFUL_ENABLED in ${localSettingsPath}`
  );

  const csprojPath = getCodefulCsprojPath(appDir);
  const csprojContent = fs.readFileSync(csprojPath, 'utf-8');
  assert.ok(csprojContent.includes('<TargetFramework>net8</TargetFramework>'), `Codeful .csproj should target net8: ${csprojPath}`);
  assert.ok(csprojContent.includes('Microsoft.Azure.Workflows.Sdk'), `Codeful .csproj should reference Workflows SDK: ${csprojPath}`);

  const expectedControlVariant = creationCase.codefulControlVariant ?? 'modern-control';
  for (const targetName of ['CopyToCodefulFolder', 'ReplaceLanguageNetCore']) {
    const afterTargets = getCsprojTargetAfterTargets(csprojContent, targetName);
    if (expectedControlVariant === 'legacy-control') {
      assert.strictEqual(afterTargets, 'Publish', `${creationCase.label} should keep ${targetName} as a legacy Publish-only target`);
    } else {
      const targetTokens = getAfterTargetsTokens(afterTargets);
      assert.ok(
        targetTokens.includes('Build') && targetTokens.includes('Publish'),
        `${creationCase.label} should keep ${targetName} on the modern Build;Publish target. Actual: ${afterTargets ?? '(missing)'}`
      );
    }
  }
}

function getCodefulCsprojPath(appDir: string): string {
  const csprojFiles = fs.readdirSync(appDir).filter((name) => name.endsWith('.csproj'));
  assert.strictEqual(csprojFiles.length, 1, `Expected exactly one codeful .csproj in ${appDir}, found ${csprojFiles.join(', ')}`);
  const csprojFile = csprojFiles[0];
  assert.ok(csprojFile, `Expected a codeful .csproj in ${appDir}`);
  return path.join(appDir, csprojFile);
}

function getCsprojTargetAfterTargets(csprojContent: string, targetName: string): string | null {
  const targetMatch = csprojContent.match(new RegExp(`<Target\\b[^>]*Name=["']${targetName}["'][^>]*>`));
  if (!targetMatch) {
    return null;
  }

  const afterTargetsMatch = targetMatch[0].match(/\bAfterTargets=["']([^"']+)["']/);
  return afterTargetsMatch?.[1] ?? '';
}

function getAfterTargetsTokens(afterTargets: string | null): string[] {
  return (afterTargets ?? '')
    .split(';')
    .map((token) => token.trim())
    .filter(Boolean);
}

function getExpectedWorkflowKind(workflowType: WorkflowType): string {
  switch (workflowType) {
    case 'Stateless':
      return 'Stateless';
    case 'Conversational agents (Preview)':
      return 'Agent';
    case 'Stateful':
    case 'Autonomous agents (Preview)':
      return 'Stateful';
    default: {
      const exhaustive: never = workflowType;
      return exhaustive;
    }
  }
}

function verifyFunctionProject(workspaceDir: string, creationCase: WorkspaceCreationCase, workspaceContent: WorkspaceJson): void {
  const functionFolderName = requiredValue(creationCase.functionFolderName);
  const functionName = requiredValue(creationCase.functionName);
  const functionNamespace = requiredValue(creationCase.functionNamespace);
  const functionDir = path.join(workspaceDir, functionFolderName);
  const functionCsPath = path.join(functionDir, `${functionName}.cs`);
  const functionProjectPath = path.join(functionDir, `${functionName}.csproj`);

  assertWorkspaceFolderPath(
    path.join(workspaceDir, `${creationCase.wsName}.code-workspace`),
    workspaceContent,
    functionFolderName,
    functionDir,
    creationCase
  );
  assert.ok(fs.existsSync(functionDir), `Function project directory should exist: ${functionDir}`);
  assert.ok(fs.existsSync(functionCsPath), `Function .cs file should exist: ${functionCsPath}`);
  assert.ok(fs.existsSync(functionProjectPath), `Function .csproj file should exist: ${functionProjectPath}`);
  verifyFunctionVsCodeArtifacts(functionDir, creationCase);

  const functionSource = fs.readFileSync(functionCsPath, 'utf-8');
  assert.ok(functionSource.includes(functionNamespace), `Function source should include namespace ${functionNamespace}`);
  assert.ok(functionSource.includes(functionName), `Function source should include function name ${functionName}`);

  if (creationCase.appType === 'rulesEngine') {
    assert.ok(
      fs.existsSync(path.join(functionDir, 'ContosoPurchase.cs')),
      'Rules engine function folder should include ContosoPurchase.cs'
    );
  }
}

function verifyFunctionVsCodeArtifacts(functionDir: string, creationCase: WorkspaceCreationCase): void {
  const vscodeDir = path.join(functionDir, '.vscode');
  for (const fileName of ['settings.json', 'extensions.json', 'tasks.json']) {
    assert.ok(fs.existsSync(path.join(vscodeDir, fileName)), `${creationCase.label} function app should generate .vscode/${fileName}`);
  }

  const settings = readJsonFile<Record<string, unknown>>(path.join(vscodeDir, 'settings.json'));
  assert.strictEqual(settings['azureFunctions.projectLanguage'], 'C#', `${creationCase.label} function app should set C# project language`);
  assert.strictEqual(settings['azureFunctions.projectRuntime'], '~4', `${creationCase.label} function app should set Functions runtime ~4`);
  assert.strictEqual(
    settings['debug.internalConsoleOptions'],
    'neverOpen',
    `${creationCase.label} function app should suppress debug console auto-open`
  );
  assert.strictEqual(
    settings['azureFunctions.preDeployTask'],
    'publish (functions)',
    `${creationCase.label} function app should set predeploy task`
  );
  assert.strictEqual(settings['azureFunctions.templateFilter'], 'Core', `${creationCase.label} function app should use Core templates`);
  assert.strictEqual(
    settings['azureFunctions.showTargetFrameworkWarning'],
    false,
    `${creationCase.label} function app should suppress target framework warning`
  );
  const deploySubpath = settings['azureFunctions.deploySubpath'];
  assert.strictEqual(typeof deploySubpath, 'string', `${creationCase.label} function app should set deploySubpath`);
  const deploySubpathValue = String(deploySubpath);
  assert.ok(deploySubpathValue.startsWith('bin/Release/'), `${creationCase.label} function app deploySubpath should use Release output`);
  assert.ok(deploySubpathValue.endsWith('/publish'), `${creationCase.label} function app deploySubpath should point to publish output`);

  const extensions = readJsonFile<ExtensionsJson>(path.join(vscodeDir, 'extensions.json'));
  assertRecommendations(
    extensions,
    [functionsExtensionId, dotnetExtensionId],
    `${creationCase.label} function app .vscode/extensions.json`
  );

  const tasks = readJsonFile<TasksJson>(path.join(vscodeDir, 'tasks.json'));
  assert.strictEqual(tasks.version, '2.0.0', `${creationCase.label} function app tasks.json should use VS Code tasks schema 2.0.0`);
  const taskList = assertRecordArray<TaskJson>(tasks.tasks, `${creationCase.label} function app tasks.json tasks`);
  assertTaskLabels(taskList, ['build'], creationCase);
  const buildTask = requiredTask(taskList, 'build', creationCase);
  assert.strictEqual(buildTask.type, 'process', `${creationCase.label} function app build should be a process task`);
  assert.strictEqual(buildTask.command, dotnetBinaryPathSetting, `${creationCase.label} function app build should use configured dotnet`);
  assert.deepStrictEqual(
    buildTask.args,
    ['build', '${workspaceFolder}'],
    `${creationCase.label} function app build should target the workspace folder`
  );
  assert.deepStrictEqual(
    buildTask.group,
    { kind: 'build', isDefault: true },
    `${creationCase.label} function app build should be the default build`
  );
}

function readJsonFile<T>(filePath: string): T {
  assert.ok(fs.existsSync(filePath), `Expected JSON file to exist: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function assertRecommendations(extensions: ExtensionsJson, expectedRecommendations: string[], context: string): void {
  const recommendations = assertStringArray(extensions.recommendations, `${context} recommendations`);
  for (const expected of expectedRecommendations) {
    assert.ok(recommendations.includes(expected), `${context} should recommend ${expected}. Actual: ${JSON.stringify(recommendations)}`);
  }
}

function assertStringArray(value: unknown, context: string): string[] {
  assert.ok(Array.isArray(value), `${context} should be an array`);
  for (const item of value) {
    assert.strictEqual(typeof item, 'string', `${context} should only contain strings`);
  }
  return value as string[];
}

function assertRecord(value: unknown, context: string): Record<string, unknown> {
  assert.ok(isRecord(value), `${context} should be an object`);
  return value;
}

function assertRecordArray<T extends Record<string, unknown>>(value: unknown, context: string): T[] {
  assert.ok(Array.isArray(value), `${context} should be an array`);
  for (const item of value) {
    assert.ok(isRecord(item), `${context} should only contain objects`);
  }
  return value as T[];
}

function requiredTask(tasks: TaskJson[], label: string, creationCase: WorkspaceCreationCase): TaskJson {
  const task = tasks.find((candidate) => candidate.label === label);
  assert.ok(
    task,
    `${creationCase.label} tasks.json should include task ${label}. Tasks: ${JSON.stringify(tasks.map((candidate) => candidate.label))}`
  );
  return task;
}

function requiredValue(value: string | undefined): string {
  assert.ok(value, 'Expected required workspace creation value to be defined');
  return value;
}

async function runNameFieldCases(
  cdp: CdpEvaluator,
  contextId: number,
  fieldName: string,
  labels: FieldLabels,
  validPrefix: string,
  cases: [string, string, string][]
): Promise<void> {
  for (const [caseName, invalidValue, expectedMessage] of cases) {
    const validValue = uniqueName(validPrefix);
    if (invalidValue) {
      await runInvalidThenValidCase(cdp, contextId, {
        name: `${fieldName} ${caseName}`,
        labels,
        invalidValue,
        expectedMessage,
        validValue,
      });
    } else {
      await runEmptyThenValidCase(cdp, contextId, `${fieldName} ${caseName}`, labels, validValue);
    }
  }
}

async function runInvalidThenValidCase(cdp: CdpEvaluator, contextId: number, testCase: FieldValidationCase): Promise<void> {
  await enterFieldValue(cdp, contextId, testCase.labels, testCase.invalidValue);
  await waitForFieldValidationMessage(cdp, contextId, testCase.labels, testCase.expectedMessage);
  await enterFieldValue(cdp, contextId, testCase.labels, testCase.validValue);
  await waitForFieldValidationMessageToClear(cdp, contextId, testCase.labels, testCase.expectedMessage);
}

async function runEmptyThenValidCase(
  cdp: CdpEvaluator,
  contextId: number,
  name: string,
  labels: FieldLabels,
  validValue: string
): Promise<void> {
  await enterFieldValue(cdp, contextId, labels, validValue);
  await enterFieldValue(cdp, contextId, labels, '');
  await waitForFieldValidationMessage(cdp, contextId, labels, emptyValidationMessage);
  await assertNextButtonDisabled(cdp, contextId, name);
  await enterFieldValue(cdp, contextId, labels, validValue);
  await waitForFieldValidationMessageToClear(cdp, contextId, labels, emptyValidationMessage);
}

async function runThreeRequiredFieldGatingCases(
  cdp: CdpEvaluator,
  contextId: number,
  name: string,
  fields: {
    first: { labels: FieldLabels; validValue: string };
    second: { labels: FieldLabels; validValue: string };
    third: { labels: FieldLabels; validValue: string };
  }
): Promise<void> {
  await enterFieldValue(cdp, contextId, fields.first.labels, '');
  await enterFieldValue(cdp, contextId, fields.second.labels, '');
  await enterFieldValue(cdp, contextId, fields.third.labels, '');
  await waitForFieldValidationMessage(cdp, contextId, fields.first.labels, emptyValidationMessage);
  await assertNextButtonDisabled(cdp, contextId, `${name}: all empty`);

  await enterFieldValue(cdp, contextId, fields.first.labels, uniqueName(fields.first.validValue));
  await assertNextButtonDisabled(cdp, contextId, `${name}: first valid only`);

  await enterFieldValue(cdp, contextId, fields.first.labels, '');
  await enterFieldValue(cdp, contextId, fields.second.labels, fields.second.validValue);
  await assertNextButtonDisabled(cdp, contextId, `${name}: second valid only`);

  await enterFieldValue(cdp, contextId, fields.second.labels, '');
  await enterFieldValue(cdp, contextId, fields.third.labels, uniqueName(fields.third.validValue));
  await assertNextButtonDisabled(cdp, contextId, `${name}: third valid only`);

  await enterFieldValue(cdp, contextId, fields.first.labels, uniqueName(fields.first.validValue));
  await enterFieldValue(cdp, contextId, fields.second.labels, fields.second.validValue);
  await enterFieldValue(cdp, contextId, fields.third.labels, '');
  await assertNextButtonDisabled(cdp, contextId, `${name}: first and second valid`);

  await enterFieldValue(cdp, contextId, fields.second.labels, '');
  await enterFieldValue(cdp, contextId, fields.third.labels, uniqueName(fields.third.validValue));
  await assertNextButtonDisabled(cdp, contextId, `${name}: first and third valid`);

  await enterFieldValue(cdp, contextId, fields.first.labels, '');
  await enterFieldValue(cdp, contextId, fields.second.labels, fields.second.validValue);
  await assertNextButtonDisabled(cdp, contextId, `${name}: second and third valid`);

  await enterFieldValue(cdp, contextId, fields.first.labels, uniqueName(fields.first.validValue));
  await enterFieldValue(cdp, contextId, fields.second.labels, fields.second.validValue);
  await enterFieldValue(cdp, contextId, fields.third.labels, uniqueName(fields.third.validValue));
  await assertNextButtonEnabled(cdp, contextId, `${name}: all valid`);
}

async function enterFieldValue(cdp: CdpEvaluator, contextId: number, labels: FieldLabels, value: string): Promise<void> {
  const focusResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; value?: string }>(
    contextId,
    withField(
      labels,
      `input.focus();
      input.select();
      return { ok: true, value: input.value };`
    )
  );

  assert.strictEqual(
    focusResult.ok,
    true,
    focusResult.reason ?? `Failed to focus ${getLabels(labels).join('/')} field. Text: ${focusResult.text ?? ''}`
  );

  try {
    await replaceFocusedInputText(cdp, value);
  } catch {
    await cdp.evaluate(
      contextId,
      withField(
        labels,
        `setInputValue(input, ${JSON.stringify(value)});
        return { ok: true, value: input.value };`
      )
    );
  }

  const result = await waitForFieldValue(cdp, contextId, labels, value);
  assert.strictEqual(
    result.value,
    value,
    `Expected field "${getLabels(labels).join('/')}" to equal "${value}". State: ${JSON.stringify(result)}`
  );
}

async function waitForFieldVisible(cdp: CdpEvaluator, contextId: number, labels: FieldLabels): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels).catch(() => undefined);
    if (result?.ok) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const text = await getPageText(cdp, contextId);
  assert.fail(`Timed out waiting for field "${getLabels(labels).join('/')}" to be visible. Webview text: ${text}`);
}

async function waitForFieldHidden(cdp: CdpEvaluator, contextId: number, labels: FieldLabels): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels).catch(() => undefined);
    if (!result?.ok) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const result = await getFieldState(cdp, contextId, labels).catch((error) => ({ text: String(error) }));
  assert.fail(`Expected field "${getLabels(labels).join('/')}" to be hidden. State: ${JSON.stringify(result)}`);
}

async function waitForFieldValidationMessage(
  cdp: CdpEvaluator,
  contextId: number,
  labels: FieldLabels,
  expectedMessage: string
): Promise<void> {
  const deadline = Date.now() + (expectedMessage === 'not exist' ? 45000 : 10000);
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels);
    const fieldText = `${result.fieldText ?? ''}\n${result.validationText ?? ''}`;
    if (containsIgnoreCase(fieldText, expectedMessage)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const finalState = await getFieldState(cdp, contextId, labels).catch((error) => ({ text: String(error) }));
  assert.fail(
    `Timed out waiting for validation message "${expectedMessage}" on field "${getLabels(labels).join('/')}". State: ${JSON.stringify(finalState)}`
  );
}

async function waitForFieldValidationMessageToClear(
  cdp: CdpEvaluator,
  contextId: number,
  labels: FieldLabels,
  message: string
): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels);
    const fieldText = `${result.fieldText ?? ''}\n${result.validationText ?? ''}`;
    if (!containsIgnoreCase(fieldText, message)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const result = await getFieldState(cdp, contextId, labels).catch((error) => ({ text: String(error) }));
  assert.fail(
    `Timed out waiting for validation message "${message}" to clear on field "${getLabels(labels).join('/')}". State: ${JSON.stringify(result)}`
  );
}

async function waitForAsyncValidationToSettle(cdp: CdpEvaluator, contextId: number): Promise<void> {
  const pendingMessages = ['Validating path', 'Checking workspace availability'];
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const pageText = await getPageText(cdp, contextId);
    if (!pendingMessages.some((message) => containsIgnoreCase(pageText, message))) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const pageText = await getPageText(cdp, contextId);
  assert.fail(`Timed out waiting for async Create Workspace validation to settle. Webview text: ${pageText}`);
}

async function assertNextButtonDisabled(cdp: CdpEvaluator, contextId: number, context: string): Promise<void> {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const result = await getNextButtonState(cdp, contextId);
    if (result.found && result.disabled) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const result = await getNextButtonState(cdp, contextId);
  assert.fail(`Expected Next button to be disabled for ${context}. State: ${JSON.stringify(result)}`);
}

async function assertNextButtonEnabled(cdp: CdpEvaluator, contextId: number, context: string): Promise<void> {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const result = await getNextButtonState(cdp, contextId);
    if (result.found && !result.disabled) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const result = await getNextButtonState(cdp, contextId);
  assert.fail(`Expected Next button to be enabled for ${context}. State: ${JSON.stringify(result)}`);
}

async function assertWizardButtonDisabledOrAbsent(
  cdp: CdpEvaluator,
  contextId: number,
  buttonText: string,
  context: string
): Promise<void> {
  const result = await getWizardButtonState(cdp, contextId, buttonText);
  assert.ok(
    !result.found || result.disabled,
    `Expected ${buttonText} button to be disabled or absent for ${context}. State: ${JSON.stringify(result)}`
  );
}

async function assertDropdownHasOptions(cdp: CdpEvaluator, contextId: number, labelText: string, expectedOptions: string[]): Promise<void> {
  const focusResult = await getDropdownClickPoint(cdp, contextId, labelText);
  assert.strictEqual(focusResult.ok, true, focusResult.reason ?? `Failed to find "${labelText}" dropdown. Text: ${focusResult.text ?? ''}`);
  assert.ok(focusResult.point, `Failed to locate "${labelText}" dropdown click point.`);

  await clickPoint(cdp, focusResult.point);
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await dispatchDropdownClickFallback(cdp, contextId, labelText);
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'Enter', undefined, 13);
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'Space', ' ', 32);
  }
  await waitForDropdownOptions(cdp, contextId);
  const options = await getVisibleDropdownOptions(cdp, contextId);
  for (const expectedOption of expectedOptions) {
    assert.ok(
      options.some((option) => option === expectedOption),
      `Expected "${labelText}" dropdown to include "${expectedOption}". Options: ${JSON.stringify(options)}`
    );
  }
  await pressKey(cdp, 'Escape', 'Escape', 27);
}

async function selectRadioOption(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<void> {
  const focusResult = await cdp.evaluate<{ ok: boolean; reason?: string; text?: string; point?: Point }>(
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

      const clickable = radioRoot instanceof HTMLElement ? radioRoot : input;
      clickable.scrollIntoView({ block: 'center', inline: 'center' });
      input.focus();
      const rect = clickable.getBoundingClientRect();
      return {
        ok: true,
        text: radioRoot.outerHTML,
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      };
    })()`
  );

  assert.strictEqual(
    focusResult.ok,
    true,
    focusResult.reason ?? `Failed to focus radio option "${labelText}". Text: ${focusResult.text ?? ''}`
  );
  assert.ok(focusResult.point, `Failed to locate radio option "${labelText}" click point.`);
  await clickPoint(cdp, focusResult.point);
  if (!(await isRadioOptionChecked(cdp, contextId, labelText))) {
    await dispatchRadioClickFallback(cdp, contextId, labelText);
  }
  if (!(await isRadioOptionChecked(cdp, contextId, labelText))) {
    await pressKey(cdp, 'Space', ' ', 32);
  }
  await waitForRadioOptionChecked(cdp, contextId, labelText);
}

async function dispatchRadioClickFallback(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<void> {
  await cdp.evaluate(
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
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      input.focus();
      input.click();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`
  );
}

async function selectDropdownOption(cdp: CdpEvaluator, contextId: number, labelText: string, optionText: string): Promise<void> {
  if (await isDropdownValueSelected(cdp, contextId, labelText, optionText)) {
    return;
  }

  const focusResult = await getDropdownClickPoint(cdp, contextId, labelText);

  assert.strictEqual(
    focusResult.ok,
    true,
    focusResult.reason ?? `Failed to focus "${labelText}" dropdown. Text: ${focusResult.text ?? ''}`
  );
  assert.ok(focusResult.point, `Failed to locate "${labelText}" dropdown click point.`);
  await clickPoint(cdp, focusResult.point);
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await dispatchDropdownClickFallback(cdp, contextId, labelText);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'Enter', undefined, 13);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'Space', ' ', 32);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!(await hasDropdownOptions(cdp, contextId))) {
    await pressKey(cdp, 'ArrowDown', 'ArrowDown', 40);
    await new Promise((resolve) => setTimeout(resolve, 250));
    await pressKey(cdp, 'Enter', undefined, 13);
    await new Promise((resolve) => setTimeout(resolve, 500));
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
  await waitForDropdownValue(cdp, contextId, labelText, optionText);
}

async function getDropdownClickPoint(
  cdp: CdpEvaluator,
  contextId: number,
  labelText: string
): Promise<{ ok: boolean; reason?: string; text?: string; point?: Point }> {
  return cdp.evaluate<{ ok: boolean; reason?: string; text?: string; point?: Point }>(
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
      const dropdownId = label?.getAttribute('for');
      const field = label?.closest('[class*="fui-Field"]') || label?.parentElement;
      const dropdown = (dropdownId ? document.getElementById(dropdownId) : null) || field?.querySelector('button[role="combobox"]');
      if (!(dropdown instanceof HTMLButtonElement)) {
        return { ok: false, reason: 'Dropdown button not found', text: document.body?.innerText || '' };
      }

      dropdown.scrollIntoView({ block: 'center', inline: 'center' });
      dropdown.focus();
      const rect = dropdown.getBoundingClientRect();
      return {
        ok: true,
        text: document.body?.innerText || '',
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      };
    })()`
  );
}

async function dispatchDropdownClickFallback(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<void> {
  await cdp.evaluate(
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
      const dropdownId = label?.getAttribute('for');
      const field = label?.closest('[class*="fui-Field"]') || label?.parentElement;
      const dropdown = (dropdownId ? document.getElementById(dropdownId) : null) || field?.querySelector('button[role="combobox"]');
      if (!(dropdown instanceof HTMLButtonElement)) {
        return;
      }

      dropdown.focus();
      dropdown.click();
    })()`
  );
}

async function waitForDropdownOptions(cdp: CdpEvaluator, contextId: number): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await hasDropdownOptions(cdp, contextId)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const pageText = await getPageText(cdp, contextId);
  assert.fail(`Timed out waiting for dropdown options. Text: ${pageText}`);
}

async function getVisibleDropdownOptions(cdp: CdpEvaluator, contextId: number): Promise<string[]> {
  return cdp.evaluate<string[]>(
    contextId,
    `(() => {
      const normalize = (value) => (value || '').replace(/\\*/g, '').replace(/\\s+/g, ' ').trim();
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      return Array.from(document.querySelectorAll('[role="option"]')).filter(isVisible).map((option) => normalize(option.textContent));
    })()`
  );
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

async function waitForRadioOptionChecked(cdp: CdpEvaluator, contextId: number, labelText: string): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const result = await cdp.evaluate<{ checked: boolean; text?: string }>(
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
        return { checked: input instanceof HTMLInputElement ? input.checked : false, text: radioRoot?.outerHTML || document.body?.innerText || '' };
      })()`
    );
    if (result.checked) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const result = await getNextButtonState(cdp, contextId);
  assert.fail(`Expected radio option "${labelText}" to be checked. State: ${JSON.stringify(result)}`);
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

async function waitForDropdownValue(cdp: CdpEvaluator, contextId: number, labelText: string, optionText: string): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await isDropdownValueSelected(cdp, contextId, labelText, optionText)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const result = await getNextButtonState(cdp, contextId);
  assert.fail(`Expected dropdown "${labelText}" to select "${optionText}". State: ${JSON.stringify(result)}`);
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

async function clickPoint(cdp: CdpEvaluator, point: Point): Promise<void> {
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

async function getFieldState(
  cdp: CdpEvaluator,
  contextId: number,
  labels: FieldLabels
): Promise<{
  ok: boolean;
  reason?: string;
  value?: string;
  fieldText?: string;
  validationText?: string;
  pageText?: string;
  ariaInvalid?: string | null;
  describedBy?: string | null;
}> {
  return cdp.evaluate(
    contextId,
    withField(
      labels,
      `return {
      ok: true,
      value: input.value,
      fieldText: field?.innerText || '',
      validationText: getValidationText(input, field),
      pageText: document.body?.innerText || '',
      ariaInvalid: input.getAttribute('aria-invalid'),
      describedBy: input.getAttribute('aria-describedby'),
    };`
    )
  );
}

async function waitForFieldValue(
  cdp: CdpEvaluator,
  contextId: number,
  labels: FieldLabels,
  expectedValue: string
): Promise<{ ok: boolean; value?: string; fieldText?: string; pageText?: string }> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const result = await getFieldState(cdp, contextId, labels);
    if (result.value === expectedValue) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return getFieldState(cdp, contextId, labels);
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

async function getNextButtonState(
  cdp: CdpEvaluator,
  contextId: number
): Promise<{ found: boolean; disabled?: boolean; text?: string; pageText?: string; fieldValues?: unknown[] }> {
  return getWizardButtonState(cdp, contextId, 'Next');
}

async function getWizardButtonState(
  cdp: CdpEvaluator,
  contextId: number,
  buttonText: string
): Promise<{ found: boolean; disabled?: boolean; text?: string; pageText?: string; fieldValues?: unknown[] }> {
  return cdp.evaluate(
    contextId,
    `(() => {
      const expectedButtonText = ${JSON.stringify(buttonText)};
      const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const buttons = Array.from(document.querySelectorAll('button')).filter(isVisible);
      const button = buttons.find((candidate) => (candidate.textContent || '').includes(expectedButtonText));
      const invalidFields = Array.from(document.querySelectorAll('input[aria-invalid="true"]')).map((input) => {
        const label = input.id ? document.querySelector('label[for="' + CSS.escape(input.id) + '"]') : null;
        const field = input.closest('[class*="fui-Field"]') || input.parentElement;
        return {
          label: label?.textContent || '',
          value: input instanceof HTMLInputElement ? input.value : '',
          text: field?.innerText || '',
        };
      });
      const fieldValues = Array.from(document.querySelectorAll('input')).filter(isVisible).map((input) => {
        const label = input.id ? document.querySelector('label[for="' + CSS.escape(input.id) + '"]') : null;
        const field = input.closest('[class*="fui-Field"]') || input.parentElement;
        return {
          label: label?.textContent || '',
          type: input instanceof HTMLInputElement ? input.type : '',
          value: input instanceof HTMLInputElement ? input.value : '',
          checked: input instanceof HTMLInputElement ? input.checked : undefined,
          text: field?.innerText || '',
        };
      });
      const pageText = document.body?.innerText || '';
      if (!button) {
        return { found: false, text: pageText, pageText, invalidFields, fieldValues };
      }

      const disabled = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
      return { found: true, disabled, text: button.textContent || '', pageText, invalidFields, fieldValues };
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
      const fieldRoot = label?.closest('[class*="fui-Field"]') || label?.parentElement?.parentElement || label?.parentElement;
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
      const fieldInputs = fieldRoot ? Array.from(fieldRoot.querySelectorAll('input')).filter(isVisible) : [];
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

      const field = input.closest('[class*="fui-Field"]') || input.parentElement;
      const getValidationText = (inputElement, fieldElement) => {
        const describedBy = inputElement.getAttribute('aria-describedby');
        const describedText = describedBy
          ? describedBy
              .split(/\\s+/)
              .map((id) => document.getElementById(id)?.innerText || '')
              .filter(Boolean)
              .join('\\n')
          : '';
        return [describedText, fieldElement?.innerText || ''].filter(Boolean).join('\\n');
      };
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
