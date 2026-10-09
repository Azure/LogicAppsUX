import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as vscode from 'vscode';
import { connectToVsCodeCdp, connectToVsCodeWorkbenchCdp, type CdpConnection, waitForWebviewFrameContext } from './cdpClient';
import { closeCopilotChatIfVisible } from './copilotChat';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { HttpTimeoutComposeDriver } from './httpTimeoutComposeDriver';
import { assertHttpTimeoutWorkspaceIdentity } from './httpTimeoutComposeEnvironment';
import {
  httpTimeoutComposeDesignerViewType,
  httpTimeoutComposeRemaining,
  pollHttpTimeoutCompose,
  selectHttpTimeoutComposeDesignerV2,
} from './httpTimeoutComposeOracle';
import {
  assertHttpTimeoutActionFailed,
  assertHttpTimeoutRequestPersisted,
  httpTimeoutInvalidDurationError,
  httpTimeoutPt24hRuntimeError,
  selectHttpTimeoutRequestWorkspace,
} from './httpTimeoutRequestOracle';
import {
  readLogicAppsStandardOutputSnapshot,
  readLogicAppsStandardOutputText,
  selectLogicAppsStandardOutputThroughWorkbench,
  showLogicAppsStandardOutput,
} from './logicAppsOutputChannel';
import { captureEvidenceScreenshot, installFailureScreenshotHook } from './screenshot';
import { installStatelessHistorySettings } from './statelessVariablesControls';
import { normalizeFsPath, uniqueName } from './testUtils';
import { closeAllTabs, getWebviewTabs, waitForWebviewTab } from './webviewTabs';
import { statelessLifecycleHelpers as helpers, type CreatedWorkspace } from './workspaceLifecycle.test';
import {
  assertAzureConnectorAccountTreePrerequisite,
  readApprovedAzureConnectorFixture,
  readApprovedAzureSubscriptionName,
  readApprovedExistingResourceGroup,
  selectApprovedAzureConnectorFixturePrompt,
} from './azureConnectorFixture';
import { handleAffirmativeConnectorWorkbenchPrompt } from './workbenchPrompts';

const managementRoot = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
const apiVersion = '2019-10-01-edge-preview';
const scenario = process.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_SCENARIO;
const mode = process.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE;

installDialogGuard();
installFailureScreenshotHook();

suite('HTTP timeout request original clauses', () => {
  test('proves the selected isolated HTTP timeout request clause', async function () {
    this.timeout(1_200_000);
    assert.ok(scenario === 'execution' || scenario === 'validation', 'Use a registered HTTP timeout request scenario');
    const label = scenario === 'execution' ? 'http-timeout-request-execution' : 'http-timeout-request-validation';
    if (mode === 'create') {
      const parent = process.env.LA_E2E_CLI_WORKSPACE_PARENT;
      const manifestPath = process.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MANIFEST;
      assert.ok(parent && manifestPath, 'HTTP timeout request creation requires runner-owned paths');
      const entry = await helpers.createWorkspaceThroughWebview(
        {
          label,
          appType: 'standard',
          wfType: 'Stateless',
          radioLabel: 'Logic app (Standard)',
          wsName: uniqueName(`${scenario}httpws`),
          appName: uniqueName(`${scenario}httpapp`),
          wfName: uniqueName(`${scenario}httpwf`),
        },
        parent
      );
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, `${JSON.stringify([entry], null, 2)}\n`);
      return;
    }

    assert.strictEqual(mode, 'run', 'Use the registered HTTP timeout request lifecycle runner');
    const deadline = Date.now() + 1_080_000;
    const parent = process.env.LA_E2E_CLI_WORKSPACE_PARENT;
    const manifestPath = process.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MANIFEST;
    assert.ok(parent && manifestPath, 'HTTP timeout request run requires runner-owned paths');
    const entry = selectHttpTimeoutRequestWorkspace(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), label);
    assertHttpTimeoutWorkspaceIdentity(process.env.LA_E2E_CLI_STARTUP_RESOURCE ?? '', entry.workspaceFilePath, parent);
    assert.strictEqual(normalizeFsPath(vscode.workspace.workspaceFile?.fsPath ?? ''), normalizeFsPath(entry.workspaceFilePath));
    const initial = readWorkflow(entry);
    assert.strictEqual(initial.kind, 'Stateless');
    assert.deepStrictEqual(initial.definition?.triggers, {});
    assert.deepStrictEqual(initial.definition?.actions, {});

    const endpoint = await startOwnedDelayEndpoint();
    try {
      if (scenario === 'execution') {
        await provePt1sExecution(entry, endpoint, deadline);
      } else {
        await provePt24hAndInvalidValidation(entry, endpoint.url, deadline);
      }
    } finally {
      await helpers.stopDebuggingAndTasks();
      await endpoint.close();
      await closeAllTabs();
      await assertNoDialogAttempts('HTTP timeout request lifecycle');
    }
  });
});

async function provePt1sExecution(entry: CreatedWorkspace, endpoint: OwnedDelayEndpoint, deadline: number): Promise<void> {
  const session = await openDesigner(entry, deadline, 'HTTP PT1S actual designer');
  try {
    await authorHttpRequest(session.driver, endpoint.url, 'PT1S', entry, deadline);
    await captureEvidenceScreenshot(
      'http-timeout-request-pt1s-authored',
      {
        kind: 'designerCanvas',
        label: 'httpTimeoutRequestExecution',
        requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received'], 'HTTP'],
      },
      {
        semanticCdp: session.cdp,
        semanticContextId: session.contextId,
        deadlineMs: deadline,
        binding: { activeTabText: [entry.wfName, 'Workspace'] },
      }
    );
  } finally {
    session.dispose();
    await closeAllTabs();
  }

  const historyLease = installStatelessHistorySettings(entry.appDir, entry.wfName);
  try {
    historyLease.assertInstalled();
    await helpers.startDebuggingGeneratedWorkspace(entry);
    const run = await invokeAndWaitForRun(entry, deadline);
    assert.strictEqual(run.status, 'Failed', `Exact HTTP timeout run ${run.name} must fail`);
    assertHttpTimeoutActionFailed(run.actions, run.name);
    const endpointRequests = endpoint.requests();
    assert.ok(endpointRequests.length > 0, 'The exact run must reach the runner-owned delayed endpoint');
    assert.ok(
      endpointRequests.some((request) => request.method === 'GET' && request.path === '/longresponse'),
      'The exact run must issue GET /longresponse'
    );
    assert.ok(
      endpointRequests.every((request) => request.responseCompletedAt === undefined),
      'The owned endpoint must still be delaying every response when the HTTP action fails'
    );
    await openOverview(entry, deadline);
    await captureEvidenceScreenshot(
      'http-timeout-request-pt1s-run-failed',
      { kind: 'workbenchShell', label: 'httpTimeoutRequestExecutionHistory' },
      { deadlineMs: deadline, binding: { activeTabText: [entry.wfName] } }
    );
  } finally {
    await helpers.stopDebuggingAndTasks();
    historyLease.restore();
  }
}

async function provePt24hAndInvalidValidation(entry: CreatedWorkspace, endpoint: string, deadline: number): Promise<void> {
  let session = await openDesigner(entry, deadline, 'HTTP PT24H actual designer');
  try {
    await authorHttpRequest(session.driver, endpoint, 'PT24H', entry, deadline);
    await captureEvidenceScreenshot(
      'http-timeout-request-pt24h-saved',
      {
        kind: 'designerCanvas',
        label: 'httpTimeoutRequestValidation',
        requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received'], 'HTTP'],
      },
      {
        semanticCdp: session.cdp,
        semanticContextId: session.contextId,
        deadlineMs: deadline,
        binding: { activeTabText: [entry.wfName, 'Workspace'] },
      }
    );
  } finally {
    session.dispose();
    await closeAllTabs();
  }

  const outputWorkbench = await connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs: 15_000 });
  try {
    const outputDeadline = Math.min(deadline, Date.now() + 30_000);
    await showLogicAppsStandardOutput(
      () => vscode.commands.getCommands(true),
      (command, ...args) => vscode.commands.executeCommand(command, ...args),
      outputDeadline,
      () => selectLogicAppsStandardOutputThroughWorkbench(outputWorkbench, outputDeadline)
    );
    const baselineOutput = await readLogicAppsStandardOutputSnapshot(outputWorkbench, outputDeadline);
    const baselineOccurrences = baselineOutput.split(httpTimeoutPt24hRuntimeError).length - 1;
    await helpers.startDebuggingGeneratedWorkspace(entry);
    await readLogicAppsStandardOutputText(outputWorkbench, deadline, httpTimeoutPt24hRuntimeError, baselineOccurrences + 1);
    await captureEvidenceScreenshot(
      'http-timeout-request-pt24h-runtime-validation',
      { kind: 'workbenchShell', label: 'httpTimeoutRequestValidationOutput' },
      { deadlineMs: deadline, binding: { semanticText: [httpTimeoutPt24hRuntimeError] } }
    );
  } finally {
    outputWorkbench.dispose();
    await helpers.stopDebuggingAndTasks();
  }

  session = await openDesigner(entry, deadline, 'HTTP invalid duration actual designer');
  try {
    await session.driver.configureHttpRequestSettings('InvalidString');
    const messages = await pollHttpTimeoutCompose(
      () => session.driver.visibleValidationMessages(),
      (value) => value.includes(httpTimeoutInvalidDurationError),
      deadline,
      'invalid ISO 8601 duration validation'
    );
    assert.ok(messages.includes(httpTimeoutInvalidDurationError));
    assert.strictEqual(await session.driver.saveEnabled(), false, 'InvalidString must not become a persisted workflow definition');
    assertHttpTimeoutRequestPersisted(readWorkflow(entry), 'PT24H', endpoint);
    await captureEvidenceScreenshot(
      'http-timeout-request-invalid-duration',
      {
        kind: 'designerValidationError',
        label: 'httpTimeoutRequestInvalidDuration',
        message: httpTimeoutInvalidDurationError,
      },
      {
        semanticCdp: session.cdp,
        semanticContextId: session.contextId,
        deadlineMs: deadline,
        binding: { activeTabText: [entry.wfName, 'Workspace'], semanticText: [httpTimeoutInvalidDurationError] },
      }
    );
  } finally {
    session.dispose();
  }
}

async function authorHttpRequest(
  driver: HttpTimeoutComposeDriver,
  endpoint: string,
  timeout: string,
  entry: CreatedWorkspace,
  deadline: number
): Promise<void> {
  await driver.waitForDesignerReady();
  await driver.addRequestTrigger();
  await driver.addAction('HTTP', 'HTTP', ['http']);
  await driver.fillParameter(['URI'], endpoint);
  await driver.configureHttpRequestSettings(timeout);
  await driver.closePanel();
  await driver.save();
  const persisted = await pollHttpTimeoutCompose(
    async () => readWorkflow(entry),
    (value) => {
      try {
        assertHttpTimeoutRequestPersisted(value, timeout, endpoint);
        return true;
      } catch {
        return false;
      }
    },
    deadline,
    `persisted HTTP timeout ${timeout}`
  );
  assertHttpTimeoutRequestPersisted(persisted, timeout, endpoint);
}

interface DesignerSession {
  cdp: CdpConnection;
  contextId: number;
  driver: HttpTimeoutComposeDriver;
  dispose(): void;
}

async function openDesigner(entry: CreatedWorkspace, deadline: number, targetName: string): Promise<DesignerSession> {
  const azureFixture = await readApprovedExistingResourceGroup(readApprovedAzureConnectorFixture(), deadline);
  const extension = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');
  assert.ok(extension);
  await selectHttpTimeoutComposeDesignerV2(
    () => vscode.workspace.getConfiguration('azureLogicAppsStandard'),
    vscode.ConfigurationTarget.Workspace
  );
  await extension.activate();
  const azureResources = vscode.extensions.getExtension('ms-azuretools.vscode-azureresourcegroups');
  assert.ok(azureResources?.isActive, 'Logic Apps activation must initialize Azure Resources');
  assertAzureConnectorAccountTreePrerequisite(await azureResources.exports.getApi('^0.0.1'), process.env.LA_E2E_CLI_MINIMAL_ACTIVATION);
  await closeCopilotChatIfVisible(targetName, { absentSettleMs: 0 });
  await closeAllTabs();
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(entry.workflowJsonPath), { preview: false });
  const workbench = await connectToVsCodeWorkbenchCdp({
    activate: false,
    timeoutMs: Math.min(15_000, httpTimeoutComposeRemaining(deadline)),
  });
  let commandError: unknown;
  const command = vscode.commands.executeCommand('azureLogicAppsStandard.openDesigner', vscode.Uri.file(entry.workflowJsonPath));
  command.then(undefined, (error) => {
    commandError = error;
  });
  const handlePrompt = async () => {
    const nativeWorkbench = {
      evaluate: workbench.evaluate.bind(workbench),
      send: (method: string, params?: Record<string, unknown>) =>
        workbench.send(method, params, { timeoutMs: Math.min(3000, httpTimeoutComposeRemaining(deadline)) }),
    };
    await handleAffirmativeConnectorWorkbenchPrompt(nativeWorkbench, entry.appName, deadline, (prompt) =>
      selectApprovedAzureConnectorFixturePrompt(nativeWorkbench, prompt, azureFixture, deadline, () =>
        readApprovedAzureSubscriptionName(azureFixture, deadline)
      )
    );
  };
  try {
    await pollHttpTimeoutCompose(
      async () => {
        await handlePrompt();
        if (commandError) {
          throw commandError;
        }
        const tabs = getWebviewTabs(httpTimeoutComposeDesignerViewType);
        return tabs.length === 1 && tabs[0].isActive && tabs[0].label.includes(entry.wfName);
      },
      Boolean,
      deadline,
      'actual HTTP timeout request designer tab'
    );
    const tab = getWebviewTabs(httpTimeoutComposeDesignerViewType)[0];
    const cdp = await connectToVsCodeCdp({ targetName });
    try {
      const contextId = await waitForWebviewFrameContext(cdp, {
        allTextIncludes: ['Workflow', 'Code', 'Save'],
        description: targetName,
        requiredSelector:
          '[data-testid="card-Add a trigger"], [data-testid="card-Add trigger"], [aria-label="Add a trigger"], [aria-label="Add trigger"]',
        timeoutMs: Math.min(180_000, httpTimeoutComposeRemaining(deadline)),
        beforePoll: handlePrompt,
      });
      const assertActive = () => {
        const tabs = getWebviewTabs(httpTimeoutComposeDesignerViewType);
        assert.strictEqual(tabs.length, 1);
        assert.strictEqual(tabs[0], tab);
        assert.strictEqual(tab.isActive, true);
        if (commandError) {
          throw commandError;
        }
        httpTimeoutComposeRemaining(deadline);
      };
      return {
        cdp,
        contextId,
        driver: new HttpTimeoutComposeDriver(cdp, contextId, deadline, assertActive),
        dispose: () => cdp.dispose(),
      };
    } catch (error) {
      cdp.dispose();
      throw error;
    }
  } finally {
    workbench.dispose();
  }
}

function readWorkflow(entry: CreatedWorkspace): {
  kind?: unknown;
  definition?: { triggers?: Record<string, unknown>; actions?: Record<string, unknown> };
} {
  return JSON.parse(fs.readFileSync(entry.workflowJsonPath, 'utf8'));
}

interface OwnedDelayRequest {
  method: string;
  path: string;
  receivedAt: string;
  responseCompletedAt?: string;
}

interface OwnedDelayEndpoint {
  url: string;
  requests(): OwnedDelayRequest[];
  close(): Promise<void>;
}

async function startOwnedDelayEndpoint(): Promise<OwnedDelayEndpoint> {
  const observations: OwnedDelayRequest[] = [];
  const timers = new Set<NodeJS.Timeout>();
  const server = http.createServer((request, response) => {
    const observation: OwnedDelayRequest = {
      method: request.method ?? '',
      path: request.url ?? '',
      receivedAt: new Date().toISOString(),
    };
    observations.push(observation);
    const timer = setTimeout(() => {
      timers.delete(timer);
      observation.responseCompletedAt = new Date().toISOString();
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"status":"completed"}');
    }, 300_000);
    timer.unref();
    timers.add(timer);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    url: `http://127.0.0.1:${address.port}/longresponse`,
    requests: () => structuredClone(observations),
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const timer of timers) {
          clearTimeout(timer);
        }
        timers.clear();
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}

interface HttpResult {
  status: number;
  body: string;
  headers: http.IncomingHttpHeaders;
}

async function invokeAndWaitForRun(entry: CreatedWorkspace, deadline: number): Promise<{ name: string; status: string; actions: unknown }> {
  const workflowUrl = `${managementRoot}/workflows/${encodeURIComponent(entry.wfName)}`;
  const triggerName = Object.keys(readWorkflow(entry).definition?.triggers ?? {})[0];
  assert.ok(triggerName, 'Saved HTTP timeout workflow must contain the Request trigger');
  let callbackUrl = '';
  await pollHttpTimeoutCompose(
    async () =>
      request(`${workflowUrl}/triggers/${encodeURIComponent(triggerName)}/listCallbackUrl?api-version=${apiVersion}`, 'POST', deadline),
    (result) => {
      if (result.status === 0 || result.status === 404 || result.status === 503) {
        return false;
      }
      assert.strictEqual(result.status, 200);
      const value = (JSON.parse(result.body) as { value?: unknown }).value;
      assert.ok(typeof value === 'string' && value.length > 0);
      callbackUrl = value;
      return true;
    },
    deadline,
    'HTTP timeout Request callback URL'
  );
  const callback = await request(callbackUrl, 'POST', deadline, '{}');
  assert.ok(callback.status === 202 || callback.status === 500, `Unexpected callback status ${callback.status}`);
  const runName = callback.headers['x-ms-workflow-run-id'];
  assert.ok(typeof runName === 'string' && runName.length > 0, 'Callback must identify the exact workflow run');
  const runUrl = `${workflowUrl}/runs/${encodeURIComponent(runName)}`;
  let status = '';
  await pollHttpTimeoutCompose(
    async () => request(`${runUrl}?api-version=${apiVersion}`, 'GET', deadline),
    (result) => {
      if (result.status === 404) {
        return false;
      }
      assert.strictEqual(result.status, 200);
      status = String((JSON.parse(result.body) as { properties?: { status?: unknown } }).properties?.status ?? '');
      return ['Succeeded', 'Failed', 'Cancelled', 'TimedOut'].includes(status);
    },
    deadline,
    `exact HTTP timeout run ${runName}`
  );
  const actions = await request(`${runUrl}/actions?api-version=${apiVersion}`, 'GET', deadline);
  assert.strictEqual(actions.status, 200);
  return { name: runName, status, actions: JSON.parse(actions.body) };
}

async function openOverview(entry: CreatedWorkspace, deadline: number): Promise<void> {
  await closeAllTabs();
  await vscode.commands.executeCommand('azureLogicAppsStandard.openOverview', vscode.Uri.file(entry.workflowJsonPath));
  await waitForWebviewTab('workflowOverview', 0, Math.min(90_000, httpTimeoutComposeRemaining(deadline)));
}

function request(url: string, method: string, deadline: number, body?: string): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const operation = http.request(
      {
        hostname: requestUrl.hostname,
        port: requestUrl.port,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
        timeout: Math.min(10_000, httpTimeoutComposeRemaining(deadline)),
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: response.headers,
          })
        );
      }
    );
    operation.on('timeout', () => operation.destroy(new Error('Local workflow management request timed out')));
    operation.on('error', reject);
    operation.end(body);
  });
}
