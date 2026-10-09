import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { isDeepStrictEqual } from 'util';
import * as vscode from 'vscode';
import { type CdpConnection, connectToVsCodeCdp, connectToVsCodeWorkbenchCdp, waitForWebviewFrameContext } from './cdpClient';
import { closeCopilotChatIfVisible } from './copilotChat';
import { HttpTimeoutComposeDriver } from './httpTimeoutComposeDriver';
import { assertHttpTimeoutWorkspaceIdentity } from './httpTimeoutComposeEnvironment';
import { handleAffirmativeConnectorWorkbenchPrompt } from './workbenchPrompts';
import {
  assertHttpTimeoutComposeAuthored,
  assertHttpTimeoutComposePersisted,
  assertHttpTimeoutComposeVisibleError,
  httpTimeoutComposeAction,
  httpTimeoutComposeDesignerViewType,
  httpTimeoutComposeError,
  type HttpTimeoutComposeWorkflow,
  httpTimeoutComposeRemaining,
  pollHttpTimeoutCompose,
  replaceHttpTimeoutComposeAction,
  selectHttpTimeoutComposeWorkspace,
  selectHttpTimeoutComposeDesignerV2,
} from './httpTimeoutComposeOracle';
import { captureEvidenceScreenshot, installFailureScreenshotHook } from './screenshot';
import { closeAllTabs, getWebviewTabs } from './webviewTabs';
import {
  closeActiveDesignerTab,
  openDesignerFromExactExplorerFile,
  openExactExplorerFileInNativeEditor,
  pasteJsonValueIntoActiveNativeEditor,
  saveAndCloseActiveNativeEditor,
} from './workbenchEditorActions';
import { boundedCdp } from './workbenchCdpActions';
import { activeWebview } from './workspaceMultiRootWorkbench';
import {
  assertApprovedAzureConnectorFixtureSaved,
  assertAzureConnectorAccountTreePrerequisite,
  readApprovedAzureConnectorFixture,
  readApprovedAzureSubscriptionName,
  readApprovedExistingResourceGroup,
  selectApprovedAzureConnectorFixturePrompt,
} from './azureConnectorFixture';

installFailureScreenshotHook();

if (!process.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE) {
  registerHttpTimeoutComposeOriginalSuite();
}

function registerHttpTimeoutComposeOriginalSuite(): void {
  suite('HTTP timeout Compose original authoring clause', () => {
    test('Request and Compose -> native workflow.json replacement -> reopen designer -> exact visible unsupported timeout', async function () {
      this.timeout(600_000);
      const deadline = Date.now() + 540_000;
      const manifestPath = process.env.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST;
      const parent = process.env.LA_E2E_CLI_CREATE_WORKSPACE_PARENT;
      const notBefore = Number(process.env.LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_NOT_BEFORE);
      assert.ok(manifestPath && parent && Number.isFinite(notBefore), 'Use the registered --http-timeout-compose-original lifecycle route');
      const entry = selectHttpTimeoutComposeWorkspace(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), parent, notBefore);
      await proveHttpTimeoutComposeOriginal(entry, deadline);
    });
  });
}

export async function proveHttpTimeoutComposeOriginal(
  entry: ReturnType<typeof selectHttpTimeoutComposeWorkspace>,
  deadline: number
): Promise<void> {
  const parent = entry.parentDir;
  assertHttpTimeoutWorkspaceIdentity(process.env.LA_E2E_CLI_STARTUP_RESOURCE ?? '', entry.wsFilePath, parent);
  assert.ok(vscode.workspace.workspaceFile, 'Fresh host must reopen the wizard-generated .code-workspace');
  assertHttpTimeoutWorkspaceIdentity(vscode.workspace.workspaceFile.fsPath, entry.wsFilePath, parent);
  const workflowPath = path.join(entry.wfDir, 'workflow.json');
  const readSaved = (): HttpTimeoutComposeWorkflow => JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  const initial = readSaved();
  assert.strictEqual(initial.kind, 'Stateless');
  assert.deepStrictEqual(initial.definition.triggers, {}, 'Start from the wizard-generated empty workflow');
  assert.deepStrictEqual(initial.definition.actions, {});
  const azureTarget = readApprovedAzureConnectorFixture();
  const azureFixture = await readApprovedExistingResourceGroup(azureTarget, deadline);

  const extension = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');
  assert.ok(extension);
  await selectHttpTimeoutComposeDesignerV2(
    () => vscode.workspace.getConfiguration('azureLogicAppsStandard'),
    vscode.ConfigurationTarget.Workspace
  );
  await extension.activate();
  const azureResources = vscode.extensions.getExtension('ms-azuretools.vscode-azureresourcegroups');
  assert.ok(azureResources?.isActive, 'Normal Logic Apps activation must initialize the real Azure Resources dependency');
  assertAzureConnectorAccountTreePrerequisite(await azureResources.exports.getApi('^0.0.1'), process.env.LA_E2E_CLI_MINIMAL_ACTIVATION);
  // Preserve the approved fixture's Azure target settings. If setup prompts,
  // choose its affirmative native option; never blank a subscription to bypass it.
  await closeCopilotChatIfVisible('HTTP timeout Compose setup', { absentSettleMs: 0 });
  await closeAllTabs();
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(workflowPath), { preview: false });
  let workbench: CdpConnection | undefined = await connectToVsCodeWorkbenchCdp({
    activate: false,
    timeoutMs: Math.min(15000, httpTimeoutComposeRemaining(deadline)),
  });
  const handleConnectorPrompt = async (openingDeadline = deadline) => {
    const originalDeadline = Math.min(deadline, openingDeadline);
    const promptWorkbench = workbench;
    assert.ok(promptWorkbench, 'Workbench CDP must be connected while handling the connector prompt');
    const nativeWorkbench = {
      evaluate: promptWorkbench.evaluate.bind(promptWorkbench),
      send: (method: string, params?: Record<string, unknown>) =>
        promptWorkbench.send(method, params, { timeoutMs: Math.min(3000, httpTimeoutComposeRemaining(originalDeadline)) }),
    };
    await handleAffirmativeConnectorWorkbenchPrompt(nativeWorkbench, entry.appName, originalDeadline, (prompt) =>
      selectApprovedAzureConnectorFixturePrompt(nativeWorkbench, prompt, azureFixture, originalDeadline, () =>
        readApprovedAzureSubscriptionName(azureFixture, originalDeadline)
      )
    );
  };
  try {
    let commandError: unknown;
    const command = vscode.commands.executeCommand('azureLogicAppsStandard.openDesigner', vscode.Uri.file(workflowPath));
    // Retain rejection while observing the asynchronous real tab, never turn it
    // into a passing command result or answer a dialog through an API mock.
    command.then(undefined, (error) => {
      commandError = error;
    });
    await pollHttpTimeoutCompose(
      async () => {
        await handleConnectorPrompt();
        if (commandError) {
          throw commandError;
        }
        const tabs = getWebviewTabs(httpTimeoutComposeDesignerViewType);
        return tabs.length === 1 && tabs[0].isActive && tabs[0].label.includes(entry.wfName);
      },
      Boolean,
      deadline,
      'actual workflow designer tab'
    );
    const tab = getWebviewTabs(httpTimeoutComposeDesignerViewType)[0];
    const assertActive = (): void => {
      const tabs = getWebviewTabs(httpTimeoutComposeDesignerViewType);
      assert.strictEqual(tabs.length, 1, 'No ambiguous/stale designer webviews');
      assert.strictEqual(tabs[0], tab, 'Designer tab changed');
      assert.strictEqual(tab.isActive, true, 'Actual source workflow designer must be active');
      assert.ok(tab.label.includes(entry.wfName), 'Wrong workflow designer');
      if (commandError) {
        throw commandError;
      }
      httpTimeoutComposeRemaining(deadline);
    };
    const cdp = await connectToVsCodeCdp({ targetName: 'HTTP timeout Compose actual designer' });
    let reopenedCdp: { dispose: () => void } | undefined;
    try {
      const contextId = await waitForWebviewFrameContext(cdp, {
        allTextIncludes: ['Workflow', 'Code', 'Save'],
        description: 'empty original workflow designer',
        requiredSelector:
          '[data-testid="card-Add a trigger"], [data-testid="card-Add trigger"], [data-automation-id="card-Add_a_trigger"], [data-automation-id="card-Add_trigger"], [aria-label="Add a trigger"], [aria-label="Add trigger"]',
        timeoutMs: Math.min(180_000, httpTimeoutComposeRemaining(deadline)),
        beforePoll: handleConnectorPrompt,
      });
      workbench.dispose();
      workbench = undefined;
      const driver = new HttpTimeoutComposeDriver(cdp, contextId, deadline, assertActive);
      const originalOwner = await driver.context();
      assertApprovedAzureConnectorFixtureSaved(entry.appDir, azureFixture);
      const requestTitles = ['When an HTTP request is received', 'When a HTTP request is received'];
      await driver.waitForDesignerReady();
      await captureEvidenceScreenshot(
        'http-timeout-compose-designer-ready',
        { kind: 'designerCanvas', label: 'httpTimeoutComposeOriginal', allowLoading: false },
        {
          semanticCdp: cdp,
          semanticContextId: contextId,
          deadlineMs: deadline,
          binding: { activeTabText: [entry.wfName, 'Workspace'] },
        }
      );
      await driver.addRequestTrigger();
      await driver.addAction('Compose', 'Compose');
      await driver.fillParameter(['Inputs'], 'test');
      await driver.closePanel();
      await driver.save();
      const authored = await pollHttpTimeoutCompose(
        async () => readSaved(),
        (value) => {
          const action = value.definition.actions.Compose as { type?: string; inputs?: string } | undefined;
          return action?.type === 'Compose' && action.inputs === 'test';
        },
        deadline,
        'independently persisted Request/Compose authoring'
      );
      assertHttpTimeoutComposeAuthored(authored);
      await captureEvidenceScreenshot(
        'http-timeout-compose-authored',
        {
          kind: 'designerCanvas',
          label: 'httpTimeoutComposeOriginal',
          requiredNodes: [requestTitles, 'Compose'],
        },
        {
          semanticCdp: cdp,
          semanticContextId: contextId,
          deadlineMs: deadline,
          binding: { activeTabText: [entry.wfName, 'Workspace'] },
        }
      );

      cdp.dispose();
      workbench = await connectToVsCodeWorkbenchCdp({
        activate: false,
        timeoutMs: Math.min(15000, httpTimeoutComposeRemaining(deadline)),
      });
      await closeActiveDesignerTab(httpTimeoutComposeDesignerViewType, deadline);
      const nativeCodeBefore = JSON.parse(await openExactExplorerFileInNativeEditor(workbench, workflowPath, deadline));
      assertHttpTimeoutComposeAuthored(nativeCodeBefore);
      assert.deepStrictEqual(
        nativeCodeBefore.definition,
        authored.definition,
        'Native workflow.json editor must show the independently saved authored definition'
      );
      await captureEvidenceScreenshot(
        'http-timeout-compose-native-editor-open',
        { kind: 'workbenchShell', label: 'httpTimeoutComposeOriginalNativeEditor' },
        {
          deadlineMs: deadline,
          binding: { activeTabText: ['workflow.json'] },
        }
      );
      const expected = replaceHttpTimeoutComposeAction(nativeCodeBefore);
      await pasteJsonValueIntoActiveNativeEditor(
        workbench,
        workflowPath,
        ['definition', 'actions', 'Compose', 'runtimeConfiguration'],
        httpTimeoutComposeAction.runtimeConfiguration,
        deadline
      );
      await captureEvidenceScreenshot(
        'http-timeout-compose-native-editor-replaced',
        { kind: 'workbenchShell', label: 'httpTimeoutComposeOriginalNativeEditorReplaced' },
        {
          deadlineMs: deadline,
          binding: { activeTabText: ['workflow.json'] },
        }
      );
      await saveAndCloseActiveNativeEditor(workbench, workflowPath, expected, deadline);
      const persisted = await pollHttpTimeoutCompose(
        async () => readSaved(),
        (value) => isDeepStrictEqual(value.definition.actions.Compose, expected.definition.actions.Compose),
        deadline,
        'original Code replacement saved on disk'
      );
      assertHttpTimeoutComposePersisted(persisted, expected);
      const reopenedTab = await openDesignerFromExactExplorerFile(
        workbench,
        workflowPath,
        entry.wfName,
        httpTimeoutComposeDesignerViewType,
        deadline,
        handleConnectorPrompt
      );
      const workbenchActions = boundedCdp(workbench, deadline);
      const reopened = await activeWebview(workbenchActions, reopenedTab.label, ['Workflow', 'Code', 'Save'], deadline);
      reopenedCdp = reopened.cdp;
      const assertReopenedActive = (): void => {
        const tabs = getWebviewTabs(httpTimeoutComposeDesignerViewType);
        assert.strictEqual(tabs.length, 1, 'No ambiguous/stale reopened designer webviews');
        assert.strictEqual(tabs[0], reopenedTab, 'Reopened designer tab changed');
        assert.strictEqual(reopenedTab.isActive, true, 'Reopened source workflow designer must be active');
        assert.ok(reopenedTab.label.includes(entry.wfName), 'Wrong reopened workflow designer');
        httpTimeoutComposeRemaining(deadline);
      };
      const reopenedDriver = new HttpTimeoutComposeDriver(reopened.cdp, reopened.contextId, deadline, assertReopenedActive);
      const reopenedOwner = await reopenedDriver.context();
      assert.notDeepStrictEqual(reopenedOwner, originalOwner, 'Reopened designer must have a fresh CDP owner');
      assert.notStrictEqual(reopenedOwner.targetId, originalOwner.targetId, 'Reopened designer must use a fresh CDP target');
      const observation = await pollHttpTimeoutCompose(
        () => reopenedDriver.errorObservation(),
        (value) => value.messages.includes(httpTimeoutComposeError),
        deadline,
        'exact unsupported-timeout message on the reopened designer'
      );
      assertHttpTimeoutComposeVisibleError(observation, reopenedOwner);
      assertHttpTimeoutComposePersisted(readSaved(), expected);
      await captureEvidenceScreenshot(
        'http-timeout-compose-unsupported-error',
        {
          kind: 'designerValidationError',
          label: 'httpTimeoutComposeOriginal',
          message: httpTimeoutComposeError,
        },
        {
          semanticCdp: reopened.cdp,
          semanticContextId: reopened.contextId,
          deadlineMs: deadline,
          binding: { activeTabText: [entry.wfName, 'Workspace'], semanticText: [httpTimeoutComposeError] },
        }
      );
      assertHttpTimeoutComposeVisibleError(await reopenedDriver.errorObservation(), reopenedOwner);
      assertHttpTimeoutComposePersisted(readSaved(), expected);
      console.log(
        '[http-timeout-compose] Original Compose authoring/save/error clause passed; HTTP run, Portal and Consumption residuals not exercised.'
      );
    } finally {
      cdp.dispose();
      reopenedCdp?.dispose();
      await closeAllTabs();
    }
  } finally {
    workbench?.dispose();
  }
}
