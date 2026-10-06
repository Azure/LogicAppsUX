import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as vscode from 'vscode';
import { connectToVsCodeCdp, waitForWebviewFrameContext, type CdpConnection } from './cdpClient';
import { clickPoint, pressKey, type CdpEvaluator, type Point } from './cdpFormHelpers';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { installFailureScreenshotHook } from './screenshot';
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
  type StatelessOperations,
  type StatelessSettingsLease,
} from './statelessVariablesControls';

const managementRoot = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
const apiVersion = '2019-10-01-edge-preview';
const mode = process.env.LA_E2E_CLI_STATELESS_VARIABLES_MODE;

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
    assert.strictEqual(mode, 'run', 'Use the registered stateless-variables lifecycle runner');
    const rawEntry = process.env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE;
    assert.ok(rawEntry, 'Reopen requires the exact wizard manifest entry');
    const entry = JSON.parse(rawEntry) as CreatedWorkspace;
    assert.strictEqual(entry.appType, 'standard');
    assert.strictEqual(normalizeFsPath(vscode.workspace.workspaceFile?.fsPath ?? ''), normalizeFsPath(entry.workspaceFilePath));
    assert.strictEqual(objectValue(readJson(entry.workflowJsonPath), 'reopened workflow').kind, 'Stateless');
    await helpers.waitForGeneratedLogicAppFolder(entry);
    await poll(Date.now() + 180_000, 'generated design-time settings', async () =>
      fs.existsSync(path.join(entry.appDir, 'workflow-designtime', 'local.settings.json'))
    );

    // No history is promised by default Stateless. First author and call it with
    // generated settings, then apply the opt-in to BOTH generated targets.
    let lease: StatelessSettingsLease | undefined;
    let operations: StatelessOperations | undefined;
    const positiveDeadline = Date.now() + 900_000;
    let originalFailure: unknown;
    try {
      operations = await withinDeadline(positiveDeadline, 'authoring', () => authorVariablesThroughDesigner(entry, positiveDeadline));
      await start(entry, positiveDeadline);
      const initialOverview = await openHistory(entry, positiveDeadline);
      try {
        await invoke(entry, operations, positiveDeadline);
      } finally {
        initialOverview.cdp.dispose();
      }
      await withinDeadline(positiveDeadline, 'stop before settings', () => helpers.stopDebuggingAndTasks());
      lease = installStatelessHistorySettings(entry.appDir, entry.wfName);
      lease.assertInstalled();
      await start(entry, positiveDeadline);
      lease.assertInstalled();
      await proveExactHistoryRun(entry, operations, positiveDeadline);
      await withinDeadline(positiveDeadline, 'stop for restart', () => helpers.stopDebuggingAndTasks());
      lease.assertInstalled();
      await start(entry, positiveDeadline);
      lease.assertInstalled();
      await proveExactHistoryRun(entry, operations, positiveDeadline);
      await assertNoDialogAttempts('Stateless variables lifecycle');
    } catch (error) {
      originalFailure = error;
    }

    // Always exercise restoration + a real recovered callback, including after
    // failed startup or an expired positive phase. No expired positive clock is reused.
    const recoveryFailures: unknown[] = [];
    try {
      await recoverStateless({
        stop: () => helpers.stopDebuggingAndTasks(),
        restore: () => lease?.restore(),
        restart: (deadline) => start(entry, deadline),
        verify: async (deadline) => {
          const saved = operations ?? assertStatelessDefinition(readJson(entry.workflowJsonPath));
          await invoke(entry, saved, deadline);
        },
      });
    } catch (error) {
      recoveryFailures.push(error);
    }
    if (originalFailure !== undefined || recoveryFailures.length > 0) {
      throw new AggregateError(
        [...(originalFailure === undefined ? [] : [originalFailure]), ...recoveryFailures],
        'Stateless lifecycle failed; original and independent recovery failures are retained'
      );
    }
  });
});

async function authorVariablesThroughDesigner(entry: CreatedWorkspace, deadline: number): Promise<StatelessOperations> {
  const blank = objectValue(readJson(entry.workflowJsonPath), 'wizard workflow');
  const definition = objectValue(blank.definition, 'wizard definition');
  assert.deepStrictEqual(definition.actions, {}, 'Do not seed a workflow in place of actual authoring');
  assert.deepStrictEqual(definition.triggers, {});
  // The shared warm-only path opens the actual active workflow without authoring.
  await helpers.openDesignerAndCreateWorkflow(entry, { warmOnly: true });
  const cdp = await connectToVsCodeCdp({ targetName: 'stateless variables designer' });
  try {
    const context = await waitForWebviewFrameContext(cdp, {
      allTextIncludes: ['Save', 'Add a trigger'],
      description: 'visible stateless designer',
      timeoutMs: remainingMs(deadline, 90_000),
    });
    await helpers.addRequestTriggerThroughDesigner(cdp, context, entry.label);
    await addAction(cdp, context, 'Initialize variables', ['initialize variable'], deadline);
    await helpers.clickDesignerNodeByTitle(cdp, context, 'Initialize variables');
    await configureVariable(cdp, context, 0, 'v1', 'Array', '[1,2]', deadline);
    await helpers.clickDesignerElement(cdp, context, ['button[aria-label="Add a Variable"]'], 'Add a Variable');
    await configureVariable(cdp, context, 1, 'v2', 'String', 'foo', deadline);
    await helpers.captureLifecycleScreenshot('stateless-variables-initialize-two-variables', {
      expectation: { kind: 'designerCanvas', label: entry.label, requiredNodes: [['Initialize variables']] },
      semanticCdp: cdp,
      semanticContextId: context,
    });
    await addAction(cdp, context, 'Append to array variable', ['append to array variable'], deadline);
    await configureAppend(cdp, context, 'Append to array variable', 'v1', '3', deadline);
    await addAction(cdp, context, 'Append to string variable', ['append to string variable'], deadline);
    await configureAppend(cdp, context, 'Append to string variable', 'v2', 'bar', deadline);
    await helpers.addResponseActionThroughDesigner(cdp, context, entry.label);
    await helpers.clickDesignerNodeByTitle(cdp, context, 'Response');
    await helpers.waitForDesignerParameterEditor(cdp, context, ['Status code'], remainingMs(deadline, 30_000), 'Response Status code');
    await helpers.fillDesignerParameter(cdp, context, ['Status code'], '200', 'Response Status code');
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
    remainingMs(deadline);
    await helpers.saveWorkflowThroughDesigner(cdp, context, entry.label);
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
    cdp.dispose();
  }
}

async function addAction(cdp: CdpEvaluator, context: number, title: string, variants: string[], deadline: number): Promise<void> {
  await helpers.openActionDiscoveryPanelThroughDesigner(cdp, context, 'stateless-variables');
  await helpers.searchInDiscoveryPanelThroughDesigner(cdp, context, title);
  await helpers.waitForSearchResultsThroughDesigner(cdp, context, 60_000, title);
  await helpers.selectOperationThroughDesigner(cdp, context, title, variants);
  await helpers.waitForDesignerText(cdp, context, [title], remainingMs(deadline, 60_000), `${title} inserted`);
}

async function configureVariable(
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
  await variableField(cdp, context, index, 'name', name, deadline);
  const typePoint = await variableFieldPoint(cdp, context, index, 'type', deadline);
  await clickPoint(cdp, typePoint);
  await helpers.clickDesignerElement(cdp, context, ['[role="option"]'], type);
  await variableField(cdp, context, index, 'value', value, deadline);
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
  cdp: CdpEvaluator,
  context: number,
  index: number,
  label: string,
  value: string,
  deadline: number
): Promise<void> {
  await clickPoint(cdp, await variableFieldPoint(cdp, context, index, label, deadline));
  await helpers.replaceFocusedDesignerText(cdp, value);
  await pressKey(cdp, 'Tab', 'Tab', 9); // Commit the real editor blur, not a React state injection.
}

async function configureAppend(
  cdp: CdpEvaluator,
  context: number,
  title: string,
  name: string,
  value: string,
  deadline: number
): Promise<void> {
  await helpers.clickDesignerNodeByTitle(cdp, context, title);
  await helpers.waitForDesignerParameterEditor(cdp, context, ['Name'], remainingMs(deadline, 30_000), `${title} Name`);
  await helpers.clickDesignerElement(cdp, context, ['[role="combobox"]'], 'Name', { requireTextMatch: false });
  await helpers.clickDesignerElement(cdp, context, ['[role="option"]'], name);
  await helpers.fillDesignerParameter(cdp, context, ['Value'], value, `${title} Value`);
  await pressKey(cdp, 'Tab', 'Tab', 9);
}

async function start(entry: CreatedWorkspace, deadline: number): Promise<void> {
  // No new process-owner protocol or unowned-port kills. The parent runs this
  // registered native family only on an isolated consumer host.
  await withinDeadline(deadline, 'debug startup', () => helpers.startDebuggingGeneratedWorkspace(entry, { cleanupBeforeDebug: false }));
  await withinDeadline(deadline, 'workflow health', () => helpers.waitForWorkflowHealthy(entry.wfName, remainingMs(deadline, 240_000)));
}

async function openHistory(entry: CreatedWorkspace, deadline: number): Promise<{ cdp: CdpConnection; context: number }> {
  await closeAllTabs();
  await vscode.commands.executeCommand('azureLogicAppsStandard.openOverview', vscode.Uri.file(entry.workflowJsonPath));
  await waitForWebviewTab('workflowOverview', 0, remainingMs(deadline, 60_000));
  const cdp = await connectToVsCodeCdp({ targetName: 'stateless run history' });
  try {
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

async function invoke(entry: CreatedWorkspace, operations: StatelessOperations, deadline: number): Promise<HttpResult> {
  let callback = '';
  await poll(deadline, 'local callback readiness', async () => {
    const result = await request(
      `${workflowUrl(entry)}/triggers/${encodeURIComponent(operations.trigger)}/listCallbackUrl?api-version=${apiVersion}`,
      'POST',
      deadline
    );
    if (result.status === 0 || result.status === 503 || result.status === 404) {
      return false;
    }
    assert.strictEqual(result.status, 200, 'Local callback lookup must succeed');
    const value = objectValue(JSON.parse(result.body), 'callback lookup').value;
    assert.ok(typeof value === 'string' && value.length > 0, 'Local callback lookup must return a URL');
    callback = value;
    return true;
  });
  const response = await request(callback, 'POST', deadline, '{}');
  assertStatelessResponse(response.status, response.body);
  return response;
}

async function proveExactHistoryRun(entry: CreatedWorkspace, operations: StatelessOperations, deadline: number): Promise<void> {
  const before = await request(`${workflowUrl(entry)}/runs?api-version=${apiVersion}`, 'GET', deadline);
  assert.strictEqual(before.status, 200, 'Enabled stateless history must be available');
  const previous = new Set(listValues(JSON.parse(before.body)).map((run) => String(run.name)));
  const history = await openHistory(entry, deadline);
  try {
    const callback = await invoke(entry, operations, deadline);
    const runName = callback.headers['x-ms-workflow-run-id'];
    assert.ok(typeof runName === 'string' && runName.length > 0, 'Callback must identify its actual run');
    assert.ok(!previous.has(runName), 'Callback must create a new run');
    const runUrl = `${workflowUrl(entry)}/runs/${encodeURIComponent(runName)}`;
    let run: unknown;
    await poll(deadline, 'exact callback run history', async () => {
      const result = await request(`${runUrl}?api-version=${apiVersion}`, 'GET', deadline);
      if (result.status === 404) {
        return false;
      }
      assert.strictEqual(result.status, 200, 'Exact callback run must be readable');
      run = JSON.parse(result.body);
      const status = objectValue(objectValue(run, 'run').properties, 'properties').status;
      assert.ok(!['Failed', 'Cancelled', 'TimedOut'].includes(String(status)), 'Callback run must not fail');
      return status === 'Succeeded';
    });
    const actions = await request(`${runUrl}/actions?api-version=${apiVersion}`, 'GET', deadline);
    assert.strictEqual(actions.status, 200, 'Callback run action history must be readable');
    assertStatelessRun(runName, previous, run, JSON.parse(actions.body), operations);
    const detail = await request(`${runUrl}/actions/${encodeURIComponent(operations.response)}?api-version=${apiVersion}`, 'GET', deadline);
    assert.strictEqual(detail.status, 200, 'Exact saved Response action must be readable');
    const properties = objectValue(objectValue(JSON.parse(detail.body), 'Response action').properties, 'Response properties');
    let outputs = properties.outputs;
    if (outputs === undefined) {
      const uri = objectValue(properties.outputsLink, 'Response outputs link').uri;
      assert.ok(typeof uri === 'string', 'Response outputs link must exist');
      const linked = await request(uri, 'GET', deadline);
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

interface HttpResult {
  status: number;
  body: string;
  headers: http.IncomingHttpHeaders;
}

function request(rawUrl: string, method: string, deadline: number, body?: string): Promise<HttpResult> {
  const url = new URL(rawUrl);
  assert.ok(
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
    'Stateless family permits local runtime URLs only'
  );
  const timeout = remainingMs(deadline, 15_000);
  return new Promise((resolve, reject) => {
    const clearTimer = () => {
      clearTimeout(hardTimeout);
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
    req.on('timeout', () => req.destroy(new Error('Local stateless request timeout')));
    req.on('error', (error: NodeJS.ErrnoException) => {
      clearTimer();
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
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

async function poll(deadline: number, description: string, predicate: () => Promise<boolean>): Promise<void> {
  while (remainingMs(deadline) > 0) {
    if (await withinDeadline(deadline, description, predicate)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, remainingMs(deadline, 250)));
  }
}
