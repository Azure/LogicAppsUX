import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { connectToVsCodeCdp, connectToVsCodeWorkbenchCdp, waitForWebviewFrameContext } from './cdpClient';
import { ProvenDesignerCdpActions } from './designerCdpActions';
import { designerV2ViewType, selectDesignerV2 } from './designerVersion';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { assertApprovedAzureFixture, installApprovedAzureFixture } from './approvedAzureFixture';
import {
  assertAzureConnectorAccountTreePrerequisite,
  type ApprovedAzureConnectorFixture,
  readApprovedAzureConnectorFixture,
  readApprovedAzureSubscriptionName,
  readApprovedExistingResourceGroup,
  selectApprovedAzureConnectorFixturePrompt,
} from './azureConnectorFixture';
import { type RunAfterPersistenceIdentity, readRunAfterPersistenceWorkflow } from './runAfterPersistenceOracle';
import { installFailureScreenshotHook } from './screenshot';
import { normalizeFsPath, uniqueName } from './testUtils';
import { getWebviewTabs } from './webviewTabs';
import { handleAffirmativeConnectorWorkbenchPrompt } from './workbenchPrompts';
import { statelessLifecycleHelpers as helpers, type CreatedWorkspace } from './workspaceLifecycle';

interface RunAfterPersistenceHandoff {
  schemaVersion: 1;
  workspaceFilePath: string;
  workflowJsonPath: string;
  savedSha256: string;
  identity: RunAfterPersistenceIdentity;
  approvedTarget: ApprovedAzureConnectorFixture;
}

const mode = process.env.LA_E2E_CLI_RUN_AFTER_PERSISTENCE_MODE;

installDialogGuard();
installFailureScreenshotHook();

suite('Run After persistence lifecycle', () => {
  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');
    assert.ok(extension, 'Logic Apps extension must be loaded');
    await extension.activate();
  });

  test('Creates, authors, saves, and reopens Failed-only Run After through official hosts', async function () {
    this.timeout(900_000);
    if (mode === 'create') {
      await createWorkspace();
      assertNoDialogAttempts('Run After persistence create');
      return;
    }

    const entry = readWorkspaceCase();
    assertExactWorkspaceBinding(entry);
    if (mode === 'author') {
      const azureFixture = await prepareApprovedAzureTarget(entry, Date.now() + 300_000);
      await authorAndPersist(entry, azureFixture);
    } else {
      assert.strictEqual(mode, 'reopen', 'Use the registered Run After persistence lifecycle runner');
      const azureFixture = await readApprovedExistingResourceGroup(readApprovedAzureConnectorFixture(), Date.now() + 120_000);
      assertApprovedTargetBinding(entry, azureFixture);
      await reopenAndVerify(entry, azureFixture);
    }
    assertNoDialogAttempts(`Run After persistence ${mode}`);
  });
});

async function createWorkspace(): Promise<void> {
  const parent = process.env.LA_E2E_CLI_WORKSPACE_PARENT;
  const manifest = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST;
  assert.ok(parent && manifest, 'Run After creation requires runner-owned parent and manifest');
  const entry = await helpers.createWorkspaceThroughWebview(
    {
      label: 'run-after-persistence',
      appType: 'standard',
      wfType: 'Stateful',
      radioLabel: 'Logic app (Standard)',
      wsName: uniqueName('clirunafterws'),
      appName: uniqueName('clirunafterapp'),
      wfName: uniqueName('clirunafterwf'),
    },
    parent
  );
  const generated = JSON.parse(fs.readFileSync(entry.workflowJsonPath, 'utf8')) as { kind?: unknown };
  assert.strictEqual(generated.kind, 'Stateful', 'Wizard must generate a Standard Stateful workflow');
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(manifest, `${JSON.stringify([entry], null, 2)}\n`);
}

async function authorAndPersist(entry: CreatedWorkspace, azureFixture: ApprovedAzureConnectorFixture): Promise<void> {
  const deadline = Date.now() + 600_000;
  assertApprovedTargetBinding(entry, azureFixture);
  const session = await openExactDesignerV2(entry, deadline, 'Run After author Designer V2', azureFixture);
  try {
    const request = await session.actions.addRequestTriggerAndGetIdentity();
    const firstCompose = await session.actions.addActionAndGetIdentity({
      search: 'Compose',
      operationName: 'Compose',
      variants: ['compose'],
    });
    const firstComposeInput = `run-after-upstream-${Date.now()}`;
    await session.actions.fillParameter(['Inputs', 'inputs'], firstComposeInput);
    const secondCompose = await session.actions.addActionAndGetIdentity({
      search: 'Compose',
      operationName: 'Compose',
      variants: ['compose'],
    });
    const secondComposeInput = `run-after-downstream-${Date.now()}`;
    await session.actions.fillParameter(['Inputs', 'inputs'], secondComposeInput);
    await session.actions.closePanel();

    const nodeIds = [request.nodeId, firstCompose.nodeId, secondCompose.nodeId];
    await helpers.captureLifecycleScreenshot('run-after-persistence-author-canvas', {
      expectation: {
        kind: 'designerCanvas',
        label: 'runAfterPersistenceAuthorCanvas',
        requiredNodes: [[request.title], [firstCompose.title], [secondCompose.title]],
        requiredNodeIds: nodeIds,
      },
      semanticCdp: session.cdp,
      semanticContextId: session.contextId,
    });

    await session.actions.clickNodeById(secondCompose.nodeId);
    await session.actions.openSettingsTab(secondCompose.nodeId);
    await session.actions.openRunAfterSection(secondCompose.nodeId);
    await session.actions.expandRunAfterPredecessor(secondCompose.nodeId, firstCompose.nodeId);
    const runAfter = await session.actions.setRunAfterStatuses(secondCompose.nodeId, firstCompose.nodeId, ['Failed']);
    assertFailedOnly(runAfter.statuses);
    await helpers.captureLifecycleScreenshot('run-after-persistence-author-failed-only', {
      expectation: {
        kind: 'designerPanel',
        label: 'runAfterPersistenceAuthorFailedOnly',
        actionTitle: secondCompose.title,
        nodeId: secondCompose.nodeId,
        requiredText: ['Run after', firstCompose.title],
        runAfter: { predecessorNodeId: firstCompose.nodeId, statuses: ['Failed'] },
      },
      semanticCdp: session.cdp,
      semanticContextId: session.contextId,
    });

    await session.actions.save();
    const identity: RunAfterPersistenceIdentity = {
      requestTriggerId: request.nodeId,
      firstComposeId: firstCompose.nodeId,
      secondComposeId: secondCompose.nodeId,
      firstComposeInput,
      secondComposeInput,
    };
    const persisted = await waitForSemanticWorkflow(entry.workflowJsonPath, identity, deadline);
    writeHandoff({
      schemaVersion: 1,
      workspaceFilePath: entry.workspaceFilePath,
      workflowJsonPath: entry.workflowJsonPath,
      savedSha256: persisted.sha256,
      identity,
      approvedTarget: azureFixture,
    });
    assertApprovedTargetBinding(entry, azureFixture);
    await helpers.captureLifecycleScreenshot('run-after-persistence-author-saved', {
      expectation: {
        kind: 'designerPanel',
        label: 'runAfterPersistenceAuthorSaved',
        actionTitle: secondCompose.title,
        nodeId: secondCompose.nodeId,
        requiredText: ['Run after', firstCompose.title],
        runAfter: { predecessorNodeId: firstCompose.nodeId, statuses: ['Failed'] },
      },
      semanticCdp: session.cdp,
      semanticContextId: session.contextId,
    });
  } finally {
    session.cdp.dispose();
  }
}

async function reopenAndVerify(entry: CreatedWorkspace, azureFixture: ApprovedAzureConnectorFixture): Promise<void> {
  const deadline = Date.now() + 420_000;
  const handoff = readHandoff();
  assert.strictEqual(normalizeFsPath(handoff.workspaceFilePath), normalizeFsPath(entry.workspaceFilePath));
  assert.strictEqual(normalizeFsPath(handoff.workflowJsonPath), normalizeFsPath(entry.workflowJsonPath));
  assert.deepStrictEqual(
    handoff.approvedTarget,
    azureFixture,
    'Fresh host must retain the exact approved non-secret Azure target metadata'
  );
  assertApprovedTargetBinding(entry, azureFixture);
  const before = await readRunAfterPersistenceWorkflow(entry.workflowJsonPath, handoff.identity);
  assert.strictEqual(before.sha256, handoff.savedSha256, 'Fresh host must start from the exact post-save workflow hash');

  const session = await openExactDesignerV2(entry, deadline, 'Run After reopen Designer V2', azureFixture, ['Compose', 'Compose 2']);
  try {
    await helpers.captureLifecycleScreenshot('run-after-persistence-reopen-canvas', {
      expectation: {
        kind: 'designerCanvas',
        label: 'runAfterPersistenceReopenCanvas',
        requiredNodes: ['Compose', 'Compose 2'],
        requiredNodeIds: [handoff.identity.requestTriggerId, handoff.identity.firstComposeId, handoff.identity.secondComposeId],
      },
      semanticCdp: session.cdp,
      semanticContextId: session.contextId,
    });

    const secondCompose = await session.actions.clickNodeById(handoff.identity.secondComposeId);
    await session.actions.openSettingsTab(secondCompose.nodeId);
    await session.actions.openRunAfterSection(secondCompose.nodeId);
    await session.actions.expandRunAfterPredecessor(secondCompose.nodeId, handoff.identity.firstComposeId);
    const runAfter = await session.actions.readRunAfterState(secondCompose.nodeId, handoff.identity.firstComposeId);
    assertFailedOnly(runAfter.statuses);
    await helpers.captureLifecycleScreenshot('run-after-persistence-reopen-failed-only', {
      expectation: {
        kind: 'designerPanel',
        label: 'runAfterPersistenceReopenFailedOnly',
        actionTitle: secondCompose.title,
        nodeId: secondCompose.nodeId,
        requiredText: ['Run after', runAfter.predecessorTitle],
        runAfter: { predecessorNodeId: handoff.identity.firstComposeId, statuses: ['Failed'] },
      },
      semanticCdp: session.cdp,
      semanticContextId: session.contextId,
    });

    const after = await readRunAfterPersistenceWorkflow(entry.workflowJsonPath, handoff.identity);
    assert.strictEqual(after.sha256, handoff.savedSha256, 'Fresh-host UI verification must not save or mutate workflow.json');
    assertApprovedTargetBinding(entry, azureFixture);
  } finally {
    session.cdp.dispose();
  }
}

async function openExactDesignerV2(
  entry: CreatedWorkspace,
  deadline: number,
  targetName: string,
  azureFixture: ApprovedAzureConnectorFixture,
  existingNodeTitles: string[] = []
): Promise<{
  cdp: Awaited<ReturnType<typeof connectToVsCodeCdp>>;
  contextId: number;
  actions: ProvenDesignerCdpActions;
}> {
  await selectDesignerV2(() => vscode.workspace.getConfiguration('azureLogicAppsStandard'), vscode.ConfigurationTarget.Workspace);
  const azureResources = vscode.extensions.getExtension('ms-azuretools.vscode-azureresourcegroups');
  assert.ok(azureResources?.isActive, 'Normal Logic Apps activation must initialize the real Azure Resources dependency');
  assertAzureConnectorAccountTreePrerequisite(await azureResources.exports.getApi('^0.0.1'), process.env.LA_E2E_CLI_MINIMAL_ACTIVATION);
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(entry.workflowJsonPath), { preview: false });

  const workbench = await connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs: Math.min(15_000, Math.max(1, deadline - Date.now())) });
  const nativeWorkbench = {
    evaluate: workbench.evaluate.bind(workbench),
    send: (method: string, params?: Record<string, unknown>) =>
      workbench.send(method, params, { timeoutMs: Math.min(3000, Math.max(1, deadline - Date.now())) }),
  };
  let subscriptionName: Promise<string> | undefined;
  const handlePrompt = () =>
    handleAffirmativeConnectorWorkbenchPrompt(nativeWorkbench, entry.appName, deadline, (prompt) =>
      selectApprovedAzureConnectorFixturePrompt(nativeWorkbench, prompt, azureFixture, deadline, () => {
        subscriptionName ??= readApprovedAzureSubscriptionName(azureFixture, deadline);
        return subscriptionName;
      })
    );
  let commandError: unknown;
  const command = vscode.commands.executeCommand('azureLogicAppsStandard.openDesigner', vscode.Uri.file(entry.workflowJsonPath));
  command.then(undefined, (error) => {
    commandError = error;
  });
  let designerCdp: Awaited<ReturnType<typeof connectToVsCodeCdp>> | undefined;
  let contextId: number | undefined;
  try {
    while (Date.now() < deadline) {
      await handlePrompt();
      if (commandError) {
        throw commandError;
      }
      const tabs = getWebviewTabs(designerV2ViewType);
      if (tabs.length === 1 && tabs[0].isActive && tabs[0].label.includes(entry.wfName)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (commandError) {
      throw commandError;
    }
    const openingTabs = getWebviewTabs(designerV2ViewType);
    assert.strictEqual(openingTabs.length, 1, `Expected one exact ${designerV2ViewType} tab before binding the frame`);
    assert.ok(
      openingTabs[0].isActive && openingTabs[0].label.includes(entry.wfName),
      `Expected active Designer V2 tab for ${entry.wfName} before binding the frame`
    );
    designerCdp = await connectToVsCodeCdp({ targetName });
    contextId = await waitForWebviewFrameContext(designerCdp, {
      allTextIncludes: ['Save'],
      description: `${targetName} DOM context`,
      timeoutMs: Math.min(90_000, Math.max(1, deadline - Date.now())),
      beforePoll: async () => {
        await handlePrompt();
        if (commandError) {
          throw commandError;
        }
      },
    });
  } catch (error) {
    designerCdp?.dispose();
    throw error;
  } finally {
    workbench.dispose();
  }
  assert.ok(designerCdp && contextId !== undefined, `Expected ${targetName} shared Designer CDP session`);
  const tabs = getWebviewTabs(designerV2ViewType);
  assert.strictEqual(tabs.length, 1, `Expected one exact ${designerV2ViewType} tab`);
  const tab = tabs[0];
  assert.ok(tab.isActive && tab.label.includes(entry.wfName), `Expected active Designer V2 tab for ${entry.wfName}`);
  const assertActive = () => {
    assert.ok(Date.now() < deadline, `${targetName} absolute deadline expired`);
    const current = getWebviewTabs(designerV2ViewType);
    assert.strictEqual(current.length, 1, `Expected one active ${designerV2ViewType} tab`);
    assert.strictEqual(current[0], tab, 'Designer V2 tab identity changed during the scenario');
    assert.strictEqual(tab.isActive, true, 'Designer V2 tab is not active');
    if (commandError) {
      throw commandError;
    }
  };
  const actions = new ProvenDesignerCdpActions(designerCdp, contextId, deadline, assertActive);
  await actions.waitForDesignerReady(existingNodeTitles);
  return { cdp: designerCdp, contextId, actions };
}

async function prepareApprovedAzureTarget(entry: CreatedWorkspace, deadline: number): Promise<ApprovedAzureConnectorFixture> {
  const azureFixture = await readApprovedExistingResourceGroup(readApprovedAzureConnectorFixture(), deadline);
  await helpers.waitForGeneratedLogicAppFolder(entry);
  assert.ok(Date.now() < deadline, 'Run After approved target preparation deadline expired');
  await vscode.commands.executeCommand('azureLogicAppsStandard.runProjectConsistencyCheck');
  const designTimeSettings = path.join(entry.appDir, 'workflow-designtime', 'local.settings.json');
  while (Date.now() < deadline && !fs.existsSync(designTimeSettings)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(fs.existsSync(designTimeSettings), 'Product consistency must generate workflow-designtime/local.settings.json before binding');
  const lease = installApprovedAzureFixture(entry.appDir, azureFixture);
  lease.bindGeneratedDesignTime();
  lease.assertBound();
  assertApprovedTargetBinding(entry, azureFixture);
  console.log('[run-after-persistence] Bound the approved existing Azure target before opening Designer');
  return azureFixture;
}

function assertApprovedTargetBinding(entry: CreatedWorkspace, azureFixture: ApprovedAzureConnectorFixture): void {
  assert.strictEqual(
    azureFixture.resourceGroupLocationVerified,
    true,
    'Run After persistence requires the actual approved existing resource-group location'
  );
  const token = process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN?.trim();
  for (const file of [
    path.join(entry.appDir, 'local.settings.json'),
    path.join(entry.appDir, 'workflow-designtime', 'local.settings.json'),
  ]) {
    assertApprovedAzureFixture(file, azureFixture);
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(!content.includes('LA_E2E_CLI_AZURE_ACCESS_TOKEN'), 'Azure fixture settings must never contain the access-token variable');
    if (token) {
      assert.ok(!content.includes(token), 'Azure fixture settings must never persist the access token');
    }
  }
}

function readWorkspaceCase(): CreatedWorkspace {
  const raw = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE;
  assert.ok(raw, 'Fresh host requires the exact wizard-generated workspace manifest entry');
  return JSON.parse(raw) as CreatedWorkspace;
}

function assertExactWorkspaceBinding(entry: CreatedWorkspace): void {
  assert.strictEqual(entry.appType, 'standard');
  assert.strictEqual(normalizeFsPath(vscode.workspace.workspaceFile?.fsPath ?? ''), normalizeFsPath(entry.workspaceFilePath));
}

function getHandoffPath(): string {
  const handoff = process.env.LA_E2E_CLI_RUN_AFTER_PERSISTENCE_HANDOFF;
  assert.ok(handoff, 'Run After lifecycle requires a runner-owned handoff path');
  return handoff;
}

function writeHandoff(handoff: RunAfterPersistenceHandoff): void {
  const handoffPath = getHandoffPath();
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.writeFileSync(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`);
}

function readHandoff(): RunAfterPersistenceHandoff {
  const handoffPath = getHandoffPath();
  const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8')) as RunAfterPersistenceHandoff;
  assert.strictEqual(handoff.schemaVersion, 1, 'Unsupported Run After lifecycle handoff schema');
  return handoff;
}

async function waitForSemanticWorkflow(
  workflowPath: string,
  identity: RunAfterPersistenceIdentity,
  deadline: number
): Promise<Awaited<ReturnType<typeof readRunAfterPersistenceWorkflow>>> {
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      return await readRunAfterPersistenceWorkflow(workflowPath, identity);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`Timed out waiting for strict Run After workflow persistence. Last error: ${String(lastError)}`);
}

function assertFailedOnly(statuses: Record<'Succeeded' | 'TimedOut' | 'Skipped' | 'Failed', { checked: boolean }>): void {
  assert.strictEqual(statuses.Failed.checked, true, 'Failed must be checked');
  assert.strictEqual(statuses.Succeeded.checked, false, 'Succeeded must be unchecked');
  assert.strictEqual(statuses.TimedOut.checked, false, 'TimedOut must be unchecked');
  assert.strictEqual(statuses.Skipped.checked, false, 'Skipped must be unchecked');
}
