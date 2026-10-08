import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { isDeepStrictEqual } from 'util';
import * as vscode from 'vscode';
import { connectToVsCodeCdp, connectToVsCodeWorkbenchCdp, waitForWebviewFrameContext } from './cdpClient';
import { closeCopilotChatIfVisible } from './copilotChat';
import { HttpTimeoutComposeDriver } from './httpTimeoutComposeDriver';
import { assertHttpTimeoutWorkspaceIdentity } from './httpTimeoutComposeEnvironment';
import { handleAffirmativeConnectorWorkbenchPrompt } from './workbenchPrompts';
import {
  assertHttpTimeoutComposeAuthored,
  assertHttpTimeoutComposePersisted,
  assertHttpTimeoutComposeVisibleError,
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
  assertApprovedAzureConnectorFixtureSaved,
  assertAzureConnectorAccountTreePrerequisite,
  readApprovedAzureConnectorFixture,
  readApprovedAzureSubscriptionName,
  readApprovedExistingResourceGroup,
  selectApprovedAzureConnectorFixturePrompt,
} from './azureConnectorFixture';

installFailureScreenshotHook();

suite('HTTP timeout Compose original authoring clause', () => {
  test('Request and Compose -> original Code replacement -> persisted definition -> exact visible unsupported timeout', async function () {
    this.timeout(600_000);
    const deadline = Date.now() + 540_000;
    const manifestPath = process.env.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST;
    const parent = process.env.LA_E2E_CLI_CREATE_WORKSPACE_PARENT;
    const notBefore = Number(process.env.LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_NOT_BEFORE);
    assert.ok(manifestPath && parent && Number.isFinite(notBefore), 'Use the registered --http-timeout-compose-original lifecycle route');
    const entry = selectHttpTimeoutComposeWorkspace(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), parent, notBefore);
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
    const workbench = await connectToVsCodeWorkbenchCdp({
      activate: false,
      timeoutMs: Math.min(15000, httpTimeoutComposeRemaining(deadline)),
    });
    const handleConnectorPrompt = async (openingDeadline = deadline) => {
      const originalDeadline = Math.min(deadline, openingDeadline);
      const nativeWorkbench = {
        evaluate: workbench.evaluate.bind(workbench),
        send: (method: string, params?: Record<string, unknown>) =>
          workbench.send(method, params, { timeoutMs: Math.min(3000, httpTimeoutComposeRemaining(originalDeadline)) }),
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
      try {
        const contextId = await waitForWebviewFrameContext(cdp, {
          allTextIncludes: ['Workflow', 'Code', 'Save'],
          description: 'empty original workflow designer',
          requiredSelector:
            '[data-testid="card-Add a trigger"], [data-testid="card-Add trigger"], [data-automation-id="card-Add_a_trigger"], [data-automation-id="card-Add_trigger"], [aria-label="Add a trigger"], [aria-label="Add trigger"]',
          timeoutMs: Math.min(180_000, httpTimeoutComposeRemaining(deadline)),
          beforePoll: handleConnectorPrompt,
        });
        const driver = new HttpTimeoutComposeDriver(cdp, contextId, deadline, assertActive);
        assertApprovedAzureConnectorFixtureSaved(entry.appDir, azureFixture);
        const owner = await driver.context();
        const requestTitles = ['When an HTTP request is received', 'When a HTTP request is received'];
        await driver.waitForDesignerReady();
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

        await driver.click('button', ['Code']);
        const codeBefore = JSON.parse(await driver.readCode()) as HttpTimeoutComposeWorkflow;
        assertHttpTimeoutComposeAuthored(codeBefore);
        assert.deepStrictEqual(
          codeBefore.definition,
          authored.definition,
          'Code tab must show the independently saved authored definition'
        );
        const expected = replaceHttpTimeoutComposeAction(codeBefore);
        await driver.replaceCode(JSON.stringify(expected, null, 2));
        const codeAfter = JSON.parse(await driver.readCode());
        assert.deepStrictEqual(codeAfter, expected, 'Actual rendered Code replacement must match before saving');
        await driver.save();
        const persisted = await pollHttpTimeoutCompose(
          async () => readSaved(),
          (value) => isDeepStrictEqual(value.definition.actions.Compose, expected.definition.actions.Compose),
          deadline,
          'original Code replacement saved on disk'
        );
        assertHttpTimeoutComposePersisted(persisted, expected);
        assert.deepStrictEqual(await driver.context(), owner, 'Save must retain the original designer context');
        // V2 labels this view "Workflow", not "Designer". Do not reopen or attach
        // another webview to manufacture a validation message.
        await driver.click('button', ['Workflow']);
        const observation = await pollHttpTimeoutCompose(
          () => driver.errorObservation(),
          (value) => value.messages.includes(httpTimeoutComposeError),
          deadline,
          'exact unsupported-timeout message on the same designer'
        );
        assertHttpTimeoutComposeVisibleError(observation, owner);
        assertHttpTimeoutComposePersisted(readSaved(), expected);
        await captureEvidenceScreenshot(
          'http-timeout-compose-unsupported-error',
          {
            kind: 'designerValidationError',
            label: 'httpTimeoutComposeOriginal',
            message: httpTimeoutComposeError,
          },
          {
            semanticCdp: cdp,
            semanticContextId: contextId,
            deadlineMs: deadline,
            binding: { activeTabText: [entry.wfName, 'Workspace'], semanticText: [httpTimeoutComposeError] },
          }
        );
        assertHttpTimeoutComposeVisibleError(await driver.errorObservation(), owner);
        assertHttpTimeoutComposePersisted(readSaved(), expected);
        console.log(
          '[http-timeout-compose] Original Compose authoring/save/error clause passed; HTTP run, Portal and Consumption residuals not exercised.'
        );
      } finally {
        cdp.dispose();
        await closeAllTabs();
      }
    } finally {
      workbench.dispose();
    }
  });
});
