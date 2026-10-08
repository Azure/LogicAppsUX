import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as path from 'path';
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { connectToVsCodeCdp, connectToVsCodeWorkbenchCdp, waitForWebviewFrameContext, type CdpConnection } from './cdpClient';
import { clickPoint, pressKey, type CdpEvaluator, type Point } from './cdpFormHelpers';
import { type DesignerCdpActions, ProvenDesignerCdpActions } from './designerCdpActions';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { installFailureScreenshotHook } from './screenshot';
import { assertApprovedAzureFixture, installApprovedAzureFixture } from './approvedAzureFixture';
import {
  assertAzureConnectorAccountTreePrerequisite,
  readApprovedAzureConnectorFixture,
  readApprovedAzureSubscriptionName,
  readApprovedExistingResourceGroup,
  selectApprovedAzureConnectorFixturePrompt,
  type ApprovedAzureConnectorFixture,
} from './azureConnectorFixture';
import { uniqueName, normalizeFsPath } from './testUtils';
import { closeAllTabs, waitForWebviewTab } from './webviewTabs';
import { statelessLifecycleHelpers as helpers, type CreatedWorkspace } from './workspaceLifecycle.test';
import {
  assertStatelessDefinition,
  assertStatelessResponse,
  assertStatelessRun,
  installStatelessHistorySettings,
  listValues,
  objectValue,
  recoverStateless,
  remainingMs,
  withinDeadline,
  assertPhaseActive,
  StatelessOperationScope,
  type StatelessOperations,
  type StatelessSettingsLease,
} from './statelessVariablesControls';
import { coordinateStatelessStartup, StatelessOwnedDebug, type StatelessDebugTask } from './statelessVariablesDebug';
import { selectLogicAppsStandardOutputThroughWorkbench, showLogicAppsStandardOutput } from './logicAppsOutputChannel';
import {
  handleAffirmativeConnectorWorkbenchPrompt,
  selectExactWorkbenchPromptOption,
  type DetectedWorkbenchPrompt,
} from './workbenchPrompts';

const managementRoot = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
const apiVersion = '2019-10-01-edge-preview';
const mode = process.env.LA_E2E_CLI_STATELESS_VARIABLES_MODE;
const statelessDebugPromptRules = [
  { matchText: 'Configure Azurite to autostart on project debug?', optionText: 'Enable AutoStart' },
  { matchText: 'Failed to verify "AzureWebJobsStorage" connection', optionText: 'Debug anyway' },
];

installDialogGuard();
installFailureScreenshotHook();

suite('Stateless variables lifecycle', () => {
  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');
    assert.ok(extension, 'Logic Apps extension must be loaded');
    await extension.activate();
  });

  test('Authors the stateless multi-variable workflow and proves callback, history, restart and recovery', async function () {
    this.timeout(1_500_000);
    if (mode === 'create') {
      const parent = process.env.LA_E2E_CLI_WORKSPACE_PARENT;
      const manifest = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST;
      assert.ok(parent && manifest, 'Stateless creation requires runner-owned parent and manifest');
      const entry = await helpers.createWorkspaceThroughWebview(
        {
          label: 'stateless-variables',
          appType: 'standard',
          wfType: 'Stateless',
          radioLabel: 'Logic app (Standard)',
          wsName: uniqueName('clistatelessws'),
          appName: uniqueName('clistatelessapp'),
          wfName: uniqueName('clistatelesswf'),
        },
        parent
      );
      assert.strictEqual(objectValue(readJson(entry.workflowJsonPath), 'created workflow').kind, 'Stateless');
      fs.mkdirSync(path.dirname(manifest), { recursive: true });
      fs.writeFileSync(manifest, `${JSON.stringify([entry], null, 2)}\n`);
      return;
    }
    const rawEntry = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE;
    assert.ok(rawEntry, 'Fresh host requires the exact wizard manifest entry');
    const entry = JSON.parse(rawEntry) as CreatedWorkspace;
    assert.strictEqual(entry.appType, 'standard');
    assert.strictEqual(normalizeFsPath(vscode.workspace.workspaceFile?.fsPath ?? ''), normalizeFsPath(entry.workspaceFilePath));
    assert.strictEqual(objectValue(readJson(entry.workflowJsonPath), 'reopened workflow').kind, 'Stateless');
    let azureFixture = readApprovedAzureConnectorFixture(process.env);
    if (mode === 'prepare') {
      const deadline = Date.now() + 300_000;
      const signal = new AbortController().signal;
      await prepareDesignTimeBaseline(entry, deadline, signal);
      azureFixture = await readApprovedExistingResourceGroup(azureFixture, deadline, undefined, fetch, signal);
      const preparationLease = installApprovedAzureFixture(entry.appDir, azureFixture);
      preparationLease.bindGeneratedDesignTime();
      preparationLease.assertBound();
      console.log('[stateless-variables] Prepared product-generated settings for a clean activation-time startup host');
      return;
    }
    assert.strictEqual(mode, 'run', 'Use the registered stateless-variables lifecycle runner');
    const outputDeadline = Date.now() + 30_000;
    const outputWorkbench = await connectToVsCodeWorkbenchCdp();
    let outputCommand: string;
    try {
      outputCommand = await showLogicAppsStandardOutput(
        () => vscode.commands.getCommands(true),
        (command, ...args) => vscode.commands.executeCommand(command, ...args),
        outputDeadline,
        () => selectLogicAppsStandardOutputThroughWorkbench(outputWorkbench, outputDeadline)
      );
    } finally {
      outputWorkbench.dispose();
    }
    console.log(`[stateless-variables] Showing activation-time design-time diagnostics through ${outputCommand}`);

    // No history is promised by default Stateless. First author and call it with
    // generated settings, then apply the opt-in to BOTH generated targets.
    let lease: StatelessSettingsLease | undefined;
    let operations: StatelessOperations | undefined;
    const positiveDeadline = Date.now() + 900_000;
    const azureResources = vscode.extensions.getExtension('ms-azuretools.vscode-azureresourcegroups');
    assert.ok(azureResources?.isActive, 'Normal Logic Apps activation must initialize the real Azure Resources dependency');
    assertAzureConnectorAccountTreePrerequisite(await azureResources.exports.getApi('^0.0.1'), process.env.LA_E2E_CLI_MINIMAL_ACTIVATION);
    const positiveScope = new StatelessOperationScope();
    let ownedDebug: StatelessOwnedDebug | undefined;
    const getOwnedDebug = () => (ownedDebug ??= createOwnedDebug(entry));
    const quiesce = async (deadline: number) => {
      positiveScope.cancel();
      ownedDebug?.cancel();
      await Promise.all([positiveScope.quiesce(deadline), ...(ownedDebug ? [ownedDebug.quiesce(deadline)] : [])]);
    };
    let originalFailure: unknown;
    try {
      await positiveScope.run(positiveDeadline, 'positive lifecycle', async (signal) => {
        assertPhaseActive(positiveDeadline, signal);
        azureFixture = await readApprovedExistingResourceGroup(azureFixture, positiveDeadline, undefined, fetch, signal);
        assertApprovedAzureFixture(path.join(entry.appDir, 'local.settings.json'), azureFixture);
        assertApprovedAzureFixture(path.join(entry.appDir, 'workflow-designtime', 'local.settings.json'), azureFixture);
        await waitForActivationDesignTime(positiveDeadline, signal);
        await establishDesignTime(entry, positiveDeadline, signal, azureFixture);
        operations = await authorVariablesThroughDesigner(entry, positiveDeadline, signal);
        await start(entry, getOwnedDebug(), positiveDeadline, signal, azureFixture);
        const initialOverview = await openHistory(entry, positiveDeadline, signal);
        try {
          await invoke(entry, operations, positiveDeadline, signal);
        } finally {
          initialOverview.cdp.dispose();
        }
        await getOwnedDebug().quiesce(positiveDeadline);
        await waitForRuntimePortReleased(positiveDeadline, signal);
        assertPhaseActive(positiveDeadline, signal);
        lease = installStatelessHistorySettings(entry.appDir, entry.wfName);
        lease.assertInstalled();
        await start(entry, getOwnedDebug(), positiveDeadline, signal, azureFixture);
        lease.assertInstalled();
        await proveExactHistoryRun(entry, operations, positiveDeadline, signal);
        await getOwnedDebug().quiesce(positiveDeadline);
        await waitForRuntimePortReleased(positiveDeadline, signal);
        assertPhaseActive(positiveDeadline, signal);
        lease.assertInstalled();
        await start(entry, getOwnedDebug(), positiveDeadline, signal, azureFixture);
        lease.assertInstalled();
        await proveExactHistoryRun(entry, operations, positiveDeadline, signal);
        await assertNoDialogAttempts('Stateless variables lifecycle');
      });
    } catch (error) {
      originalFailure = error;
    }

    // Always exercise restoration + a real recovered callback, including after
    // failed startup or an expired positive phase. No expired positive clock is reused.
    const recoveryFailures: unknown[] = [];
    try {
      await recoverStateless({
        quiesce,
        stop: async (deadline) => {
          if (ownedDebug) {
            await ownedDebug.quiesce(deadline);
          }
        },
        restore: () => {
          lease?.restore();
        },
        restart: async (deadline, signal) => {
          await waitForRuntimePortReleased(deadline, signal);
          await start(entry, getOwnedDebug(), deadline, signal, azureFixture);
        },
        verify: async (deadline, signal) => {
          const saved = operations ?? assertStatelessDefinition(readJson(entry.workflowJsonPath));
          await invoke(entry, saved, deadline, signal);
        },
      });
    } catch (error) {
      recoveryFailures.push(error);
    }
    if (originalFailure !== undefined || recoveryFailures.length > 0) {
      logStatelessLifecycleFailures(originalFailure, recoveryFailures);
      throw new AggregateError(
        [...(originalFailure === undefined ? [] : [originalFailure]), ...recoveryFailures],
        'Stateless lifecycle failed; original and independent recovery failures are retained'
      );
    }
  });
});

function logStatelessLifecycleFailures(originalFailure: unknown, recoveryFailures: unknown[]): void {
  const failures = [
    ...(originalFailure === undefined ? [] : [{ stage: 'positive lifecycle', error: originalFailure }]),
    ...recoveryFailures.map((error, index) => ({ stage: `recovery ${index + 1}`, error })),
  ];
  for (const failure of failures) {
    console.error(`[stateless-variables][${failure.stage}] ${formatStatelessFailure(failure.error)}`);
  }
}

function formatStatelessFailure(error: unknown, depth = 0): string {
  if (error instanceof AggregateError && depth < 4) {
    const nested = Array.from(error.errors, (entry, index) => `\n  [${index + 1}] ${formatStatelessFailure(entry, depth + 1)}`).join('');
    return `${error.name}: ${error.message}${nested}`;
  }
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }
  return String(error);
}

async function waitForActivationDesignTime(deadline: number, signal: AbortSignal): Promise<void> {
  let lastProbe = 'not started';
  try {
    await poll(
      Math.min(deadline, Date.now() + 180_000),
      'activation-time design-time operationGroups endpoint',
      async () => {
        const probes = await Promise.all(
          [8000, 8001, 8002, 8003].map(async (port) => ({
            port,
            result: await probeOperationGroups(port),
          }))
        );
        lastProbe = probes
          .map(
            ({ port, result }) => `${port}=${result.status ?? 'refused'}:${result.json ? 'json' : result.contentType || 'no-content-type'}`
          )
          .join(', ');
        return probes.some(({ result }) => result.status !== undefined && result.status >= 200 && result.status < 300 && result.json);
      },
      signal
    );
  } catch (error) {
    throw new AggregateError([error], `Activation-time design-time endpoint did not become ready. Last probe: ${lastProbe}`);
  }
  console.log(`[stateless-variables] Activation-time design-time endpoint is reachable: ${lastProbe}`);
}

function probeOperationGroups(port: number): Promise<{ status: number | undefined; contentType: string; json: boolean }> {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host: '127.0.0.1',
        port,
        path: '/runtime/webhooks/workflow/api/management/operationGroups',
        timeout: 1000,
        headers: { Accept: 'application/json' },
      },
      (response) => {
        const contentType = String(response.headers['content-type'] ?? '');
        const status = response.statusCode;
        response.resume();
        resolve({ status, contentType, json: /\bapplication\/json\b/i.test(contentType) });
      }
    );
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve({ status: undefined, contentType: '', json: false }));
  });
}

async function prepareDesignTimeBaseline(entry: CreatedWorkspace, deadline: number, signal: AbortSignal): Promise<void> {
  await helpers.waitForGeneratedLogicAppFolder(entry);
  assertPhaseActive(deadline, signal);
  await vscode.commands.executeCommand('azureLogicAppsStandard.runProjectConsistencyCheck');
  assertPhaseActive(deadline, signal);
  await poll(
    deadline,
    'product-generated design-time settings before approved fixture binding',
    async () => fs.existsSync(path.join(entry.appDir, 'workflow-designtime', 'local.settings.json')),
    signal
  );
}

async function establishDesignTime(
  entry: CreatedWorkspace,
  deadline: number,
  signal: AbortSignal,
  fixture: ApprovedAzureConnectorFixture
): Promise<void> {
  assertPhaseActive(deadline, signal);
  // Bind only after the real consistency command has generated its independent
  // design-time baseline, so startup cannot race the approved target fixture.
  await helpers.openDesignerAndCreateWorkflow(entry, { warmOnly: true, useAzureConnectors: true, azureFixture: fixture });
  assertPhaseActive(deadline, signal);
  await poll(
    deadline,
    'generated design-time settings',
    async () => fs.existsSync(path.join(entry.appDir, 'workflow-designtime', 'local.settings.json')),
    signal
  );
  assertApprovedAzureFixture(path.join(entry.appDir, 'local.settings.json'), fixture);
  // Caller idempotently binds the generated file through its guarded per-file
  // lease, then asserts both targets. Azure keys are not inherited here.
}

async function authorVariablesThroughDesigner(
  entry: CreatedWorkspace,
  deadline: number,
  signal: AbortSignal
): Promise<StatelessOperations> {
  assertPhaseActive(deadline, signal);
  const blank = objectValue(readJson(entry.workflowJsonPath), 'wizard workflow');
  const definition = objectValue(blank.definition, 'wizard definition');
  assert.deepStrictEqual(definition.actions, {}, 'Do not seed a workflow in place of actual authoring');
  assert.deepStrictEqual(definition.triggers, {});
  const cdp = await connectToVsCodeCdp({ targetName: 'stateless variables designer' });
  const cancel = () => cdp.dispose();
  signal.addEventListener('abort', cancel, { once: true });
  try {
    assertPhaseActive(deadline, signal);
    const context = await waitForWebviewFrameContext(cdp, {
      allTextIncludes: ['Save'],
      description: 'visible stateless designer',
      requiredSelector:
        '[data-testid="card-Add a trigger"], [data-testid="card-Add trigger"], [data-automation-id="card-Add_a_trigger"], [data-automation-id="card-Add_trigger"], [aria-label="Add a trigger"], [aria-label="Add trigger"]',
      timeoutMs: remainingMs(deadline, 90_000),
    });
    const designer = new ProvenDesignerCdpActions(cdp, context, deadline, () => assertPhaseActive(deadline, signal));
    await designer.waitForDesignerReady();
    await designer.addRequestTrigger();
    await addAction(designer, 'Initialize variables', ['initialize variable']);
    await designer.clickNode(['Initialize variables']);
    await configureVariable(designer, cdp, context, 0, 'v1', 'Array', '[1,2]', deadline);
    await designer.clickElement(['button[aria-label="Add a Variable"]'], 'Add a Variable');
    await configureVariable(designer, cdp, context, 1, 'v2', 'String', 'foo', deadline);
    await designer.closePanel();
    await helpers.captureLifecycleScreenshot('stateless-variables-initialize-two-variables', {
      expectation: { kind: 'designerCanvas', label: entry.label, requiredNodes: [['Initialize variables']] },
      semanticCdp: cdp,
      semanticContextId: context,
    });
    await addAction(designer, 'Append to array variable', ['append to array variable']);
    await configureAppend(designer, 'Append to array variable', 'v1', '3');
    await addAction(designer, 'Append to string variable', ['append to string variable']);
    await configureAppend(designer, 'Append to string variable', 'v2', 'bar');
    await designer.addAction('Response', 'Response', ['response']);
    await designer.clickNode(['Response']);
    await designer.fillParameter(['Status code'], '200');
    await pressKey(cdp, 'Tab', 'Tab', 9);
    for (const variable of ['v1', 'v2']) {
      await helpers.selectDynamicContentTokenForParameter(
        cdp,
        context,
        ['Body'],
        ['Variables'],
        [variable],
        `Response variable ${variable}`,
        'Variables',
        {
          // Variable tokens do not carry an action source badge; use the same
          // picker evidence contract as the existing variables-picker family.
          // The saved adjacent tokens and exact runtime body remain mandatory.
          verifyEditorTokenInScreenshot: false,
          expectedPickerSections: [{ sectionLabel: 'Variables', tokenTitles: ['v1', 'v2'] }],
        }
      );
      await pressKey(cdp, 'End', 'End', 35);
    }
    assertPhaseActive(deadline, signal);
    await designer.save();
    let saved: StatelessOperations | undefined;
    await poll(deadline, 'saved stateless actions', async () => {
      const actions = objectValue(objectValue(readJson(entry.workflowJsonPath), 'workflow').definition, 'definition').actions;
      if (Object.keys(objectValue(actions, 'actions')).length !== 4) {
        return false;
      }
      saved = assertStatelessDefinition(readJson(entry.workflowJsonPath));
      return true;
    });
    assert.ok(saved, 'Saved workflow evidence is required');
    return saved;
  } finally {
    signal.removeEventListener('abort', cancel);
    cdp.dispose();
  }
}

async function addAction(designer: DesignerCdpActions, title: string, variants: string[]): Promise<void> {
  await designer.addAction(title, title, variants);
}

async function configureVariable(
  designer: DesignerCdpActions,
  cdp: CdpEvaluator,
  context: number,
  index: number,
  name: string,
  type: string,
  value: string,
  deadline: number
): Promise<void> {
  await poll(deadline, `variable ${index} row`, async () =>
    cdp.evaluate<boolean>(context, `document.querySelectorAll('.msla-editor-initialize-variable').length === ${index + 1}`)
  );
  const expansion = await cdp.evaluate<{ expanded: boolean; point: Point }>(
    context,
    `(() => {
    const row = document.querySelectorAll('.msla-editor-initialize-variable')[${index}];
    const heading = row.querySelector('.msla-variable-editor-heading-button');
    heading.scrollIntoView({block:'center'}); const r=heading.getBoundingClientRect();
    return {expanded:heading.getAttribute('aria-expanded')==='true',point:{x:r.x+r.width/2,y:r.y+r.height/2}};
  })()`
  );
  if (!expansion.expanded) {
    await clickPoint(cdp, expansion.point);
  }
  await variableField(designer, cdp, context, index, 'name', name, deadline);
  const typePoint = await variableFieldPoint(cdp, context, index, 'type', deadline);
  await clickPoint(cdp, typePoint);
  await designer.clickElement(['[role="option"]'], type);
  await variableField(designer, cdp, context, index, 'value', value, deadline);
}

async function variableFieldPoint(cdp: CdpEvaluator, context: number, index: number, label: string, deadline: number): Promise<Point> {
  let point: Point | undefined;
  await poll(deadline, `variable ${index} ${label} editor`, async () => {
    point = await cdp.evaluate<Point | undefined>(
      context,
      `(() => {
      const row = document.querySelectorAll('.msla-editor-initialize-variable')[${index}];
      const field = Array.from(row.querySelectorAll('.msla-input-parameter-field'))
        .find(e=>(e.querySelector('.msla-input-parameter-label')?.textContent||'').replace(/\\*/g,'').trim().toLowerCase()===${JSON.stringify(label)});
      const editor = field?.querySelector('[contenteditable="true"],input:not([type="hidden"]),textarea,[role="combobox"],button');
      if(!editor || !editor.getClientRects().length) return undefined;
      editor.scrollIntoView({block:'center'}); const r=editor.getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`,
      { timeoutMs: remainingMs(deadline, 5000) }
    );
    return point !== undefined;
  });
  assert.ok(point);
  return point;
}

async function variableField(
  designer: DesignerCdpActions,
  cdp: CdpEvaluator,
  context: number,
  index: number,
  label: string,
  value: string,
  deadline: number
): Promise<void> {
  await clickPoint(cdp, await variableFieldPoint(cdp, context, index, label, deadline));
  await designer.replaceFocused(value);
  await pressKey(cdp, 'Tab', 'Tab', 9); // Commit the real editor blur, not a React state injection.
}

async function configureAppend(designer: DesignerCdpActions, title: string, name: string, value: string): Promise<void> {
  await designer.clickNode([title]);
  await designer.clickElement(['[role="combobox"]'], 'Name', { requireTextMatch: false });
  await designer.clickElement(['[role="option"]'], name);
  await designer.fillParameter(['Value'], value);
  await designer.key('Tab', 'Tab', 9);
}

function createOwnedDebug(entry: CreatedWorkspace): StatelessOwnedDebug {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(entry.appDir));
  assert.ok(folder, 'The generated app must be open as a workspace folder');
  const launch = objectValue(readJson(path.join(entry.appDir, '.vscode', 'launch.json')), 'generated launch');
  assert.ok(Array.isArray(launch.configurations) && launch.configurations.length > 0, 'Generated debug configuration is required');
  const configuration = objectValue(launch.configurations[0], 'debug configuration');
  assert.ok(typeof configuration.name === 'string' && typeof configuration.type === 'string');
  assert.strictEqual(configuration.type, 'coreclr', 'Standard generated attach shape is required');
  assert.strictEqual(configuration.request, 'attach');
  const tasksFile = objectValue(readJson(path.join(entry.appDir, '.vscode', 'tasks.json')), 'generated tasks');
  assert.ok(Array.isArray(tasksFile.tasks));
  const hostTasks = tasksFile.tasks.map((task) => objectValue(task, 'generated task')).filter((task) => task.label === 'func: host start');
  assert.strictEqual(hostTasks.length, 1, 'Exact generated Functions task identity is required');
  const taskName = String(hostTasks[0].label);
  const ownerKey = '__logicAppsStatelessTestOwner';
  const generatedConfiguration: vscode.DebugConfiguration = {
    ...configuration,
    type: 'coreclr',
    request: 'attach',
    name: String(configuration.name),
  };
  const owned = new StatelessOwnedDebug(normalizeFsPath(entry.appDir), taskName, (tag) =>
    vscode.debug.startDebugging(folder, { ...generatedConfiguration, [ownerKey]: tag })
  );
  // These exact in-memory handles remain armed until the test window exits.
  // Inadmissible cleanup must not abandon a late resolving debug launch.
  vscode.debug.onDidStartDebugSession((session) =>
    owned.sessionStarted({
      id: session.id,
      workspacePath: normalizeFsPath(session.workspaceFolder?.uri.fsPath ?? ''),
      ownerTag: typeof session.configuration[ownerKey] === 'string' ? session.configuration[ownerKey] : undefined,
      stop: () => vscode.debug.stopDebugging(session),
    })
  );
  vscode.debug.onDidTerminateDebugSession((session) => owned.sessionEnded(session.id));
  const taskHandles = new WeakMap<vscode.TaskExecution, StatelessDebugTask>();
  vscode.tasks.onDidStartTask(({ execution }) => {
    const scope = execution.task.scope;
    const handle: StatelessDebugTask = {
      id: randomUUID(),
      workspacePath: normalizeFsPath(scope && typeof scope === 'object' ? scope.uri.fsPath : ''),
      name: execution.task.name,
      terminate: () => execution.terminate(),
    };
    taskHandles.set(execution, handle);
    owned.taskStarted(handle);
  });
  vscode.tasks.onDidEndTask(({ execution }) => {
    const handle = taskHandles.get(execution);
    if (handle) {
      owned.taskEnded(handle.id);
    }
  });
  return owned;
}

async function start(
  entry: CreatedWorkspace,
  owned: StatelessOwnedDebug,
  deadline: number,
  signal: AbortSignal,
  fixture: ApprovedAzureConnectorFixture
): Promise<void> {
  assertPhaseActive(deadline, signal);
  assert.strictEqual(fixture.resourceGroupLocationVerified, true, 'Debug startup requires the verified existing Azure fixture');
  assertApprovedAzureFixture(path.join(entry.appDir, 'local.settings.json'), fixture);
  console.log('[stateless-variables] Starting owned debug launch with affirmative Azure prompt monitoring');
  const workbench = await connectToVsCodeWorkbenchCdp({
    activate: false,
    timeoutMs: remainingMs(deadline, 15_000),
  });
  let subscriptionName: Promise<string> | undefined;
  const nativeWorkbench = {
    evaluate: workbench.evaluate.bind(workbench),
    send: (method: string, params?: Record<string, unknown>) => workbench.send(method, params, { timeoutMs: remainingMs(deadline, 3000) }),
  };
  try {
    signal.throwIfAborted();
    await coordinateStatelessStartup(
      signal,
      async (startupSignal) => {
        await owned.start(startupSignal);
        console.log('[stateless-variables] Owned debug launch settled');
        await poll(
          deadline,
          'Functions Running',
          async () => {
            const status = await request('http://localhost:7071/admin/host/status', 'GET', deadline, undefined, startupSignal);
            if (status.status === 0 || status.status === 503) {
              return false;
            }
            assert.strictEqual(status.status, 200);
            return objectValue(JSON.parse(status.body), 'host status').state === 'Running';
          },
          startupSignal
        );
        console.log('[stateless-variables] Functions host reached Running');
        await poll(
          deadline,
          'exact workflow registration',
          async () => {
            const response = await request(
              `${managementRoot}/workflows?api-version=${apiVersion}`,
              'GET',
              deadline,
              undefined,
              startupSignal
            );
            if (response.status === 0 || response.status === 503) {
              return false;
            }
            assert.strictEqual(response.status, 200);
            return listValues(JSON.parse(response.body)).some((item) => item.name === entry.wfName);
          },
          startupSignal
        );
        console.log(`[stateless-variables] Exact workflow registration observed for ${entry.wfName}`);
      },
      async (startupSignal, isReady) => {
        while (!isReady()) {
          await handleAffirmativeConnectorWorkbenchPrompt(
            nativeWorkbench,
            entry.appName,
            deadline,
            (prompt) =>
              selectStatelessDebugStartupPrompt(nativeWorkbench, prompt, fixture, deadline, startupSignal, () => {
                subscriptionName ??= readApprovedAzureSubscriptionName(fixture, deadline, undefined, fetch, startupSignal);
                return subscriptionName;
              }),
            startupSignal,
            isStatelessDebugPrompt
          );
          if (!isReady()) {
            await new Promise((resolve) => setTimeout(resolve, remainingMs(deadline, 100)));
          }
        }
      },
      () => owned.cancel()
    );
  } finally {
    workbench.dispose();
  }
  console.log('[stateless-variables] Owned debug startup and prompt journey reached workflow registration');
}

async function selectStatelessDebugStartupPrompt(
  cdp: CdpEvaluator,
  prompt: DetectedWorkbenchPrompt,
  fixture: ApprovedAzureConnectorFixture,
  deadline: number,
  signal: AbortSignal,
  getSubscriptionName: () => Promise<string>
): Promise<boolean> {
  const debugRule =
    prompt.kind === 'notification'
      ? statelessDebugPromptRules.find((rule) => prompt.text.toLowerCase().includes(rule.matchText.toLowerCase()))
      : undefined;
  if (debugRule) {
    return selectExactWorkbenchPromptOption(cdp, prompt, debugRule, deadline, signal);
  }
  return selectApprovedAzureConnectorFixturePrompt(cdp, prompt, fixture, deadline, getSubscriptionName, signal);
}

function isStatelessDebugPrompt(prompt: DetectedWorkbenchPrompt): boolean {
  return statelessDebugPromptRules.some((rule) => prompt.text.toLowerCase().includes(rule.matchText.toLowerCase()));
}

async function openHistory(
  entry: CreatedWorkspace,
  deadline: number,
  signal: AbortSignal
): Promise<{ cdp: CdpConnection; context: number }> {
  assertPhaseActive(deadline, signal);
  await closeAllTabs();
  assertPhaseActive(deadline, signal);
  await vscode.commands.executeCommand('azureLogicAppsStandard.openOverview', vscode.Uri.file(entry.workflowJsonPath));
  await waitForWebviewTab('workflowOverview', 0, remainingMs(deadline, 60_000));
  const cdp = await connectToVsCodeCdp({ targetName: 'stateless run history' });
  signal.addEventListener('abort', () => cdp.dispose(), { once: true });
  try {
    assertPhaseActive(deadline, signal);
    const context = await waitForWebviewFrameContext(cdp, {
      allTextIncludes: ['Run history', 'Refresh'],
      description: 'active stateless Run history',
      timeoutMs: remainingMs(deadline, 90_000),
    });
    return { cdp, context };
  } catch (error) {
    cdp.dispose();
    throw error;
  }
}

async function invoke(
  entry: CreatedWorkspace,
  operations: StatelessOperations,
  deadline: number,
  signal: AbortSignal
): Promise<HttpResult> {
  let callback = '';
  console.log(`[stateless-variables] Waiting for callback readiness for ${entry.wfName}`);
  await poll(
    deadline,
    'local callback readiness',
    async () => {
      const result = await request(
        `${workflowUrl(entry)}/triggers/${encodeURIComponent(operations.trigger)}/listCallbackUrl?api-version=${apiVersion}`,
        'POST',
        deadline,
        undefined,
        signal
      );
      if (result.status === 0 || result.status === 503 || result.status === 404) {
        return false;
      }
      assert.strictEqual(result.status, 200, 'Local callback lookup must succeed');
      const value = objectValue(JSON.parse(result.body), 'callback lookup').value;
      assert.ok(typeof value === 'string' && value.length > 0, 'Local callback lookup must return a URL');
      callback = value;
      return true;
    },
    signal
  );
  console.log(`[stateless-variables] Callback URL is ready for ${entry.wfName}`);
  const response = await request(callback, 'POST', deadline, '{}', signal);
  console.log(`[stateless-variables] Callback invocation completed with HTTP ${response.status}`);
  assertStatelessResponse(response.status, response.body);
  return response;
}

async function proveExactHistoryRun(
  entry: CreatedWorkspace,
  operations: StatelessOperations,
  deadline: number,
  signal: AbortSignal
): Promise<void> {
  console.log(`[stateless-variables] Reading existing run history before invoking ${entry.wfName}`);
  const before = await request(`${workflowUrl(entry)}/runs?api-version=${apiVersion}`, 'GET', deadline, undefined, signal);
  assert.strictEqual(before.status, 200, 'Enabled stateless history must be available');
  const previous = new Set(listValues(JSON.parse(before.body)).map((run) => String(run.name)));
  console.log(`[stateless-variables] Existing history is readable; opening overview for ${entry.wfName}`);
  const history = await openHistory(entry, deadline, signal);
  try {
    const callback = await invoke(entry, operations, deadline, signal);
    const runName = callback.headers['x-ms-workflow-run-id'];
    assert.ok(typeof runName === 'string' && runName.length > 0, 'Callback must identify its actual run');
    assert.ok(!previous.has(runName), 'Callback must create a new run');
    const runUrl = `${workflowUrl(entry)}/runs/${encodeURIComponent(runName)}`;
    let run: unknown;
    let lastObservation = '';
    await poll(
      deadline,
      'exact callback run history',
      async () => {
        const result = await request(`${runUrl}?api-version=${apiVersion}`, 'GET', deadline, undefined, signal);
        if (result.status === 404) {
          if (lastObservation !== 'HTTP 404') {
            lastObservation = 'HTTP 404';
            console.log(`[stateless-variables] Exact callback run ${runName} history observation: ${lastObservation}`);
          }
          return false;
        }
        assert.strictEqual(result.status, 200, 'Exact callback run must be readable');
        run = JSON.parse(result.body);
        const status = objectValue(objectValue(run, 'run').properties, 'properties').status;
        const observation = `HTTP 200 status=${String(status)}`;
        if (lastObservation !== observation) {
          lastObservation = observation;
          console.log(`[stateless-variables] Exact callback run ${runName} history observation: ${lastObservation}`);
        }
        assert.ok(!['Failed', 'Cancelled', 'TimedOut'].includes(String(status)), 'Callback run must not fail');
        return status === 'Succeeded';
      },
      signal
    );
    const actions = await request(`${runUrl}/actions?api-version=${apiVersion}`, 'GET', deadline, undefined, signal);
    assert.strictEqual(actions.status, 200, 'Callback run action history must be readable');
    assertStatelessRun(runName, previous, run, JSON.parse(actions.body), operations);
    const detail = await request(
      `${runUrl}/actions/${encodeURIComponent(operations.response)}?api-version=${apiVersion}`,
      'GET',
      deadline,
      undefined,
      signal
    );
    assert.strictEqual(detail.status, 200, 'Exact saved Response action must be readable');
    const properties = objectValue(objectValue(JSON.parse(detail.body), 'Response action').properties, 'Response properties');
    let outputs = properties.outputs;
    if (outputs === undefined) {
      const uri = objectValue(properties.outputsLink, 'Response outputs link').uri;
      assert.ok(typeof uri === 'string', 'Response outputs link must exist');
      const linked = await request(uri, 'GET', deadline, undefined, signal);
      assert.strictEqual(linked.status, 200, 'Local Response outputs must be readable');
      outputs = JSON.parse(linked.body);
    }
    const responseOutput = objectValue(outputs, 'Response outputs');
    assertStatelessResponse(Number(responseOutput.statusCode), responseOutput.body);
    await helpers.waitForOverviewRunStatus(
      history.cdp,
      history.context,
      entry.wfName,
      entry.label,
      runName,
      'Succeeded',
      remainingMs(deadline, 90_000)
    );
    await helpers.captureLifecycleScreenshot(`stateless-variables-history-${runName}`, {
      expectation: { kind: 'overview', label: entry.label, workflowName: entry.wfName, runName, runStatus: 'Succeeded' },
      semanticCdp: history.cdp,
      semanticContextId: history.context,
    });
  } finally {
    history.cdp.dispose();
  }
}

async function waitForRuntimePortReleased(deadline: number, signal: AbortSignal): Promise<void> {
  const releaseDeadline = Math.min(deadline, Date.now() + 30_000);
  await poll(releaseDeadline, 'owned Functions runtime port release', canExclusivelyBindRuntimePort, signal);
  console.log('[stateless-variables] Owned Functions runtime released port 7071');
}

async function canExclusivelyBindRuntimePort(): Promise<boolean> {
  const dualStack = await tryBindRuntimePort('::', false);
  if (dualStack !== undefined) {
    return dualStack;
  }
  const ipv4 = await tryBindRuntimePort('0.0.0.0');
  if (ipv4 !== undefined) {
    return ipv4;
  }
  throw new Error('The test host cannot prove exclusive ownership availability for local runtime port 7071');
}

function tryBindRuntimePort(host: string, ipv6Only?: boolean): Promise<boolean | undefined> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
      } else if (error.code === 'EAFNOSUPPORT' || error.code === 'EADDRNOTAVAIL') {
        resolve(undefined);
      } else {
        reject(new Error(`Exclusive local runtime port probe failed with ${error.code ?? 'an unknown socket error'}`));
      }
    });
    server.listen({ port: 7071, host, ipv6Only, exclusive: true }, () => {
      server.close((error) => {
        if (error) {
          reject(new Error('Exclusive local runtime port probe could not release its temporary listener'));
        } else {
          resolve(true);
        }
      });
    });
  });
}

interface HttpResult {
  status: number;
  body: string;
  headers: http.IncomingHttpHeaders;
}

function request(rawUrl: string, method: string, deadline: number, body?: string, signal?: AbortSignal): Promise<HttpResult> {
  if (signal) {
    assertPhaseActive(deadline, signal);
  }
  const url = new URL(rawUrl);
  assert.ok(
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
    'Stateless family permits local runtime URLs only'
  );
  const timeout = remainingMs(deadline, 15_000);
  return new Promise((resolve, reject) => {
    const clearTimer = () => {
      clearTimeout(hardTimeout);
      signal?.removeEventListener('abort', cancel);
    };
    const req = http.request(
      url,
      {
        method,
        timeout,
        headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('error', () => {
          clearTimer();
          reject(new Error('Local stateless response transport failed'));
        });
        res.on('end', () => {
          clearTimer();
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8'), headers: res.headers });
        });
      }
    );
    // A continuously streaming response can defeat a socket inactivity timer.
    const hardTimeout = setTimeout(() => req.destroy(new Error('Local stateless request deadline expired')), timeout);
    const cancel = () => req.destroy(new Error('Local stateless request cancelled'));
    signal?.addEventListener('abort', cancel, { once: true });
    req.on('timeout', () => req.destroy(new Error('Local stateless request timeout')));
    req.on('error', (error: NodeJS.ErrnoException) => {
      clearTimer();
      if (signal?.aborted) {
        reject(signal.reason);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        resolve({ status: 0, body: '', headers: {} });
      } else {
        reject(new Error('Local stateless request failed')); // Do not log a signed callback/outputs URL.
      }
    });
    req.end(body);
  });
}

function workflowUrl(entry: CreatedWorkspace): string {
  return `${managementRoot}/workflows/${encodeURIComponent(entry.wfName)}`;
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function poll(deadline: number, description: string, predicate: () => Promise<boolean>, signal?: AbortSignal): Promise<void> {
  while (remainingMs(deadline) > 0) {
    signal?.throwIfAborted();
    if (await withinDeadline(deadline, description, predicate)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, remainingMs(deadline, 250)));
  }
}
