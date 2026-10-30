import * as assert from 'assert';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { isDeepStrictEqual } from 'util';
import * as vscode from 'vscode';
import {
  connectToVsCodeCdp,
  connectToVsCodeCdpByText,
  connectToVsCodeWorkbenchCdp,
  type CdpConnection,
  waitForWebviewFrameContext,
} from './cdpClient';
import { closeCopilotChatIfVisible } from './copilotChat';
import type { DesignerInsertionEvidenceHooks } from './designerCdpActions';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { HttpTimeoutComposeDriver } from './httpTimeoutComposeDriver';
import { assertHttpTimeoutWorkspaceIdentity } from './httpTimeoutComposeEnvironment';
import {
  assertHttpTimeoutComposeAuthored,
  assertHttpTimeoutComposePersisted,
  assertHttpTimeoutComposeVisibleError,
  httpTimeoutComposeAction,
  httpTimeoutComposeDesignerViewType,
  httpTimeoutComposeError,
  httpTimeoutComposeRemaining,
  pollHttpTimeoutCompose,
  replaceHttpTimeoutComposeAction,
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
  captureDiagnosticScreenshot,
  captureEvidenceScreenshot,
  defaultEvidenceScreenshotTimeoutMs,
  installFailureScreenshotHook,
} from './screenshot';
import type { ScreenshotExpectation } from './screenshotReadiness';
import { installStatelessHistorySettings, runWithOrderedCleanup } from './statelessVariablesControls';
import { normalizeFsPath, uniqueName } from './testUtils';
import { closeAllTabs, getWebviewTabs, waitForWebviewTab } from './webviewTabs';
import { statelessLifecycleHelpers as helpers, type CreatedWorkspace } from './workspaceLifecycle';
import { activeWebview } from './workspaceMultiRootWorkbench';
import {
  isLocalWorkflowManagementTimeout,
  requestLocalWorkflowManagement,
  type LocalWorkflowManagementPhase,
  type LocalWorkflowManagementResult,
} from './localWorkflowManagement';
import { findLoadedCachedExtensionEntry, type OwnedMsnProcessCleanup, teardownOwnedExtensionHost } from './ownedMsnShutdown';
import { createHttpTimeoutProcessCleanup } from './ownedMsnProcessCleanup';
import {
  assertApprovedAzureConnectorFixtureSaved,
  assertAzureConnectorAccountTreePrerequisite,
  readApprovedAzureConnectorFixture,
  readApprovedAzureSubscriptionName,
  readApprovedExistingResourceGroup,
  selectApprovedAzureConnectorFixturePrompt,
} from './azureConnectorFixture';
import { handleAffirmativeConnectorWorkbenchPrompt } from './workbenchPrompts';
import {
  closeActiveDesignerTab,
  openDesignerFromExactExplorerFile,
  openExactExplorerFileInNativeEditor,
  pasteJsonValueIntoActiveNativeEditor,
  saveAndCloseActiveNativeEditor,
} from './workbenchEditorActions';
import { disposeStoppedFuncHostTerminals, findTextInFuncHostTerminal, prepareFuncHostTerminalEvidence } from './workbenchTerminalSearch';

const managementRoot = 'http://localhost:7071/runtime/webhooks/workflow/api/management';
const apiVersion = '2019-10-01-edge-preview';
const mode = process.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE;
const httpTimeoutPt24hTerminalFindText = '1.00:00:00';
const httpTimeoutPt24hTerminalVisibleText = [httpTimeoutPt24hRuntimeError] as const;

installDialogGuard();
installFailureScreenshotHook();

suite('HTTP timeout original clauses on one workflow', () => {
  test('proves HTTP execution, HTTP validation, then Compose unsupported timeout in one session', async function () {
    this.timeout(1_800_000);
    const label = 'http-timeout-lifecycle';
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
          wsName: uniqueName('httptimeoutws'),
          appName: uniqueName('httptimeoutapp'),
          wfName: uniqueName('httprequestwf'),
        },
        parent
      );
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, `${JSON.stringify([entry], null, 2)}\n`);
      return;
    }

    assert.strictEqual(mode, 'run', 'Use the registered HTTP timeout request lifecycle runner');
    const deadline = Date.now() + 1_680_000;
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
    const processCleanup = process.platform === 'win32' ? createHttpTimeoutProcessCleanup(process.env) : undefined;
    try {
      await provePt1sExecution(entry, endpoint, deadline, processCleanup);
      await provePt24hAndInvalidValidation(entry, endpoint.url, deadline, processCleanup);
      await proveComposeUnsupportedTimeoutOnSameWorkflow(entry, endpoint.url, deadline);
      console.log(
        '[http-timeout] Scenarios 1-3 passed sequentially in one VS Code session; Portal wording and Consumption rejection remain residual.'
      );
    } finally {
      await teardownHttpTimeoutHost(entry, endpoint, processCleanup);
    }
  });
});

async function teardownHttpTimeoutHost(
  entry: CreatedWorkspace,
  endpoint: OwnedDelayEndpoint,
  processCleanup: OwnedMsnProcessCleanup | undefined
): Promise<void> {
  const workspaceParent = process.env.LA_E2E_CLI_WORKSPACE_PARENT;
  const extension = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');
  assert.ok(workspaceParent, 'HTTP timeout shutdown requires the runner-owned workspace parent');
  assert.ok(extension, 'HTTP timeout shutdown requires the installed Logic Apps extension');
  await teardownOwnedExtensionHost(
    {
      dedicatedRunHost: mode === 'run',
      familyLabel: 'Owned HTTP timeout',
      workspaceParentPrefix: 'la-e2e-cli-httpTimeoutLifecycle',
      extension: {
        id: extension.id,
        isActive: extension.isActive,
        extensionPath: extension.extensionPath,
        main: extension.packageJSON.main,
      },
      workspaceParent,
      workspaceRoots: [entry.appDir],
      resolveEntry: require.resolve,
      cachedEntry: (filename) => findLoadedCachedExtensionEntry(filename, require.cache),
    },
    [
      () => helpers.stopDebuggingAndTasks(),
      () => disposeStoppedFuncHostTerminals(Date.now() + 10_000),
      () => endpoint.close(),
      () => closeAllTabs(),
      () => assertNoDialogAttempts('HTTP timeout request lifecycle'),
    ],
    processCleanup
  );
}

async function provePt1sExecution(
  entry: CreatedWorkspace,
  endpoint: OwnedDelayEndpoint,
  deadline: number,
  processCleanup: OwnedMsnProcessCleanup | undefined
): Promise<void> {
  let session: DesignerSession | undefined;
  try {
    const activeSession = await openDesigner(entry, deadline, 'HTTP PT1S actual designer');
    session = activeSession;
    await authorHttpRequest(activeSession, endpoint.url, 'PT1S', entry, deadline);
  } catch (error) {
    await captureHttpDesignerFailure('pt1s-designer-lifecycle', error);
    throw error;
  } finally {
    session?.dispose();
    await closeAllTabs();
  }

  const historyLease = installStatelessHistorySettings(entry.appDir, entry.wfName);
  let runtimeStopped = false;
  await runWithOrderedCleanup(
    async () => {
      historyLease.assertInstalled();
      await helpers.startDebuggingGeneratedWorkspace(entry);
      await helpers.waitForWorkflowHealthy(entry.wfName, Math.min(120_000, httpTimeoutComposeRemaining(deadline)));
      await processCleanup?.capture();
      const previousRunName = await helpers.waitForRunHistoryBaseline(
        entry.wfName,
        Math.min(60_000, httpTimeoutComposeRemaining(deadline))
      );
      assert.strictEqual(previousRunName, undefined, 'Scenario 1 must begin with an empty workflow run history');
      const overview = await openOverview(entry, deadline);
      let overviewCdp = overview.cdp;
      let overviewContextId = overview.contextId;
      try {
        await captureEvidenceScreenshot(
          'http-timeout-request-pt1s-overview-empty',
          { kind: 'overview', label: 'httpTimeoutRequestEmptyHistory', workflowName: entry.wfName, emptyHistory: true },
          {
            deadlineMs: deadline,
            semanticCdp: overviewCdp,
            semanticContextId: overviewContextId,
          }
        );
        await helpers.clickOverviewRunTrigger(overviewCdp, overviewContextId, entry);
        const runName = await helpers.waitForNewRunStarted(entry.wfName, previousRunName, 60_000);
        overviewCdp.dispose();
        const reboundOverview = await connectToVsCodeCdpByText({
          targetName: 'HTTP timeout Overview webview after Run trigger',
          allTextIncludes: ['Run trigger', 'Refresh'],
          timeoutMs: Math.min(60_000, httpTimeoutComposeRemaining(deadline)),
        });
        overviewCdp = reboundOverview.cdp;
        overviewContextId = reboundOverview.contextId;
        await captureEvidenceScreenshot(
          'http-timeout-request-pt1s-overview-run-triggered',
          { kind: 'overview', label: 'httpTimeoutRequestRunTriggered', workflowName: entry.wfName },
          {
            deadlineMs: deadline,
            semanticCdp: overviewCdp,
            semanticContextId: overviewContextId,
          }
        );
        await helpers.waitForOverviewRunStatus(
          overviewCdp,
          overviewContextId,
          entry.wfName,
          'HTTP timeout request',
          runName,
          'Failed',
          Math.min(180_000, httpTimeoutComposeRemaining(deadline))
        );
        await captureEvidenceScreenshot(
          'http-timeout-request-pt1s-overview-run-failed',
          {
            kind: 'overview',
            label: 'httpTimeoutRequestExecutionHistory',
            workflowName: entry.wfName,
            runName,
            runStatus: 'Failed',
          },
          {
            deadlineMs: deadline,
            semanticCdp: overviewCdp,
            semanticContextId: overviewContextId,
          }
        );

        const run = await waitForRun(entry, runName, deadline);
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

        await helpers.clickOverviewRunRow(overviewCdp, overviewContextId, runName, 'Failed');
        await waitForWebviewTab(httpTimeoutComposeDesignerViewType, 0, Math.min(90_000, httpTimeoutComposeRemaining(deadline)));
        const monitoring = await connectToVsCodeCdpByText({
          targetName: 'HTTP timeout failed run monitoring webview',
          allTextIncludes: ['HTTP'],
          timeoutMs: Math.min(90_000, httpTimeoutComposeRemaining(deadline)),
          acceptCandidate: async (cdp, contextId) => {
            const candidate = await cdp.evaluate<{ hasMonitoringCanvas: boolean; hasRunTrigger: boolean; text: string }>(
              contextId,
              `(() => {
                const isVisible = (element) => !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
                const bodyText = document.body?.innerText || '';
                return {
                  hasMonitoringCanvas: Array.from(document.querySelectorAll('.react-flow')).some(isVisible),
                  hasRunTrigger: Array.from(document.querySelectorAll('button')).some(
                    (button) => isVisible(button) && (button.textContent || '').trim() === 'Run trigger'
                  ),
                  text: bodyText,
                };
              })()`
            );
            assert.ok(
              candidate.hasMonitoringCanvas && !candidate.hasRunTrigger,
              `Expected monitoring canvas without Overview Run trigger. Text=${candidate.text.slice(0, 1000)}`
            );
          },
        });
        try {
          await captureFailedHttpMonitoringEvidence(monitoring, entry, deadline);
        } finally {
          monitoring.cdp.dispose();
        }
      } finally {
        overviewCdp.dispose();
      }
    },
    [
      {
        phase: 'stop Scenario 1 debug/tasks',
        action: async () => {
          await helpers.stopDebuggingAndTasks();
          runtimeStopped = true;
        },
      },
      {
        phase: 'restore Scenario 1 local settings',
        action: () => {
          assert.ok(runtimeStopped, 'Scenario 1 local settings restore skipped because runtime cleanup did not complete');
          historyLease.restore();
        },
      },
    ],
    'HTTP timeout Scenario 1 failed; body and cleanup failures are retained'
  );
}

async function captureFailedHttpMonitoringEvidence(
  monitoring: { cdp: CdpConnection; contextId: number },
  entry: CreatedWorkspace,
  deadline: number
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await helpers.clickMonitoringActionCardByTitle(monitoring.cdp, monitoring.contextId, 'HTTP');
      await helpers.waitForMonitoringActionDetails(
        monitoring.cdp,
        monitoring.contextId,
        'HTTP',
        Math.min(90_000, httpTimeoutComposeRemaining(deadline)),
        `HTTP timeout failed action monitoring details attempt ${attempt}`
      );
      await captureEvidenceScreenshot(
        'http-timeout-request-pt1s-http-action-failed',
        { kind: 'monitoringAction', label: 'httpTimeoutRequestFailedAction', actionTitle: 'HTTP', expectedStatus: 'Failed' },
        {
          deadlineMs: deadline,
          semanticCdp: monitoring.cdp,
          semanticContextId: monitoring.contextId,
          binding: { activeTabText: [entry.wfName, 'Workspace'] },
        }
      );
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2 || !isRecoverableFailedHttpMonitoringEvidenceError(error)) {
        break;
      }
      console.warn(`[http-timeout][checkpoint] failed HTTP action evidence attempt ${attempt} lost readiness; reselecting exact HTTP`);
      await captureDiagnosticScreenshot(`http-timeout-request-pt1s-http-action-retry-${Date.now()}`, {
        reason: `Failed HTTP action evidence attempt ${attempt} lost its selected monitoring result`,
        timeoutMs: 5000,
      });
    }
  }
  throw lastError;
}

function isRecoverableFailedHttpMonitoringEvidenceError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes('Timed out waiting for HTTP timeout failed action monitoring details') ||
    (error.message.includes('Screenshot readiness failed for http-timeout-request-pt1s-http-action-failed') &&
      error.message.includes('monitoring-action-state-missing'))
  );
}

async function provePt24hAndInvalidValidation(
  entry: CreatedWorkspace,
  endpoint: string,
  deadline: number,
  processCleanup: OwnedMsnProcessCleanup | undefined
): Promise<void> {
  let session: DesignerSession | undefined;
  let pt24hOwner: Awaited<ReturnType<HttpTimeoutComposeDriver['context']>> | undefined;
  try {
    const activeSession = await openDesigner(entry, deadline, 'HTTP PT24H actual designer');
    session = activeSession;
    await activeSession.driver.waitForDesignerReady(['When an HTTP request is received', 'When a HTTP request is received']);
    pt24hOwner = await activeSession.driver.context();
    await captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-request-pt24h-designer-reopened', {
      kind: 'designerCanvas',
      label: 'httpTimeoutRequestPt24hDesignerReopened',
      requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received'], 'HTTP'],
    });
    await updateHttpRequestTimeout(activeSession.driver, endpoint, 'PT24H', entry, deadline, {
      timeoutConfigured: () =>
        captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-request-pt24h-timeout-configured', {
          kind: 'designerPanel',
          label: 'httpTimeoutRequestPt24hTimeoutConfigured',
          actionTitle: 'HTTP',
          requiredText: ['Settings'],
          fields: [
            {
              labels: ['Request options - Timeout'],
              exactAriaLabel: 'Request options - Timeout',
              sectionTitle: 'Networking',
              value: 'PT24H',
            },
          ],
        }),
      asyncPatternDisabled: () =>
        captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-request-pt24h-async-pattern-off', {
          kind: 'designerPanel',
          label: 'httpTimeoutRequestPt24hAsyncPatternOff',
          actionTitle: 'HTTP',
          requiredText: ['Settings'],
          switches: [
            {
              labels: ['Asynchronous pattern'],
              exactAriaLabel: 'Asynchronous pattern',
              sectionTitle: 'Networking',
              checked: false,
              stateText: 'Off',
            },
          ],
        }),
      persisted: () =>
        captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-request-pt24h-saved', {
          kind: 'designerCanvas',
          label: 'httpTimeoutRequestPt24hSaved',
          requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received'], 'HTTP'],
        }),
    });
  } catch (error) {
    await captureHttpDesignerFailure('pt24h-designer-lifecycle', error);
    throw error;
  } finally {
    session?.dispose();
    await closeAllTabs();
  }

  const terminalWorkbench = await connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs: 15_000 });
  try {
    await disposeStoppedFuncHostTerminals(Math.min(deadline, Date.now() + 10_000));
    await helpers.startDebuggingGeneratedWorkspace(entry);
    const terminalValidationDeadline = Math.min(deadline, Date.now() + 90_000);
    await findTextInFuncHostTerminal(
      terminalWorkbench,
      httpTimeoutPt24hTerminalFindText,
      httpTimeoutPt24hTerminalVisibleText,
      terminalValidationDeadline
    );
    await processCleanup?.capture();
    await prepareFuncHostTerminalEvidence(terminalWorkbench, Math.min(deadline, Date.now() + 5000));
    const terminalScreenshotDeadline = Math.min(deadline, Date.now() + defaultEvidenceScreenshotTimeoutMs);
    await captureEvidenceScreenshot(
      'http-timeout-request-pt24h-runtime-validation',
      { kind: 'workbenchShell', label: 'httpTimeoutRequestValidationTerminal' },
      { deadlineMs: terminalScreenshotDeadline, binding: { semanticText: [httpTimeoutPt24hRuntimeError] } }
    );
  } catch (error) {
    console.warn(`[http-timeout][checkpoint] PT24H terminal validation failed before debug cleanup: ${String(error)}`);
    await captureDiagnosticScreenshot(`http-timeout-request-pt24h-terminal-validation-before-cleanup-${Date.now()}`, {
      reason: 'HTTP PT24H validation was not found in the func host terminal through Ctrl+F',
      timeoutMs: 5000,
    });
    throw error;
  } finally {
    terminalWorkbench.dispose();
    await helpers.stopDebuggingAndTasks();
  }

  session = undefined;
  try {
    const activeSession = await openDesigner(entry, deadline, 'HTTP invalid duration actual designer');
    session = activeSession;
    await activeSession.driver.waitForDesignerReady(['When an HTTP request is received', 'When a HTTP request is received']);
    const invalidOwner = await activeSession.driver.context();
    assert.ok(pt24hOwner, 'PT24H Designer owner was not captured before reopening invalid-duration validation');
    assert.notDeepStrictEqual(invalidOwner, pt24hOwner, 'Invalid-duration validation must use a fresh Designer owner');
    assert.notStrictEqual(invalidOwner.targetId, pt24hOwner.targetId, 'Invalid-duration validation must use a fresh CDP target');
    await captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-request-invalid-designer-reopened', {
      kind: 'designerCanvas',
      label: 'httpTimeoutRequestInvalidDesignerReopened',
      requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received'], 'HTTP'],
    });
    await activeSession.driver.configureHttpRequestSettings('InvalidString');
    const messages = await pollHttpTimeoutCompose(
      () => activeSession.driver.visibleValidationMessages(),
      (value) => value.includes(httpTimeoutInvalidDurationError),
      deadline,
      'invalid ISO 8601 duration validation'
    );
    assert.ok(messages.includes(httpTimeoutInvalidDurationError));
    assert.strictEqual(await activeSession.driver.saveEnabled(), false, 'InvalidString must not become a persisted workflow definition');
    assertHttpTimeoutRequestPersisted(readWorkflow(entry), 'PT24H', endpoint);
    await captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-request-invalid-value-entered', {
      kind: 'designerPanel',
      label: 'httpTimeoutRequestInvalidDurationEntered',
      actionTitle: 'HTTP',
      requiredText: ['Settings'],
      fields: [{ labels: ['Request options - Timeout'], value: 'InvalidString' }],
    });
    await activeSession.driver.revealValidationMessage(httpTimeoutInvalidDurationError);
    await captureHttpDesignerEvidence(
      activeSession,
      entry,
      deadline,
      'http-timeout-request-invalid-duration',
      {
        kind: 'designerValidationError',
        label: 'httpTimeoutRequestInvalidDurationValidation',
        message: httpTimeoutInvalidDurationError,
      },
      [httpTimeoutInvalidDurationError]
    );
    await updateHttpRequestTimeout(activeSession.driver, endpoint, 'PT24H', entry, deadline, {
      persisted: () =>
        captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-request-valid-state-restored', {
          kind: 'designerCanvas',
          label: 'httpTimeoutRequestValidStateRestored',
          requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received'], 'HTTP'],
        }),
    });
  } catch (error) {
    await captureHttpDesignerFailure('invalid-duration-designer-lifecycle', error);
    throw error;
  } finally {
    session?.dispose();
    await closeAllTabs();
  }
}

async function authorHttpRequest(
  session: DesignerSession,
  endpoint: string,
  timeout: string,
  entry: CreatedWorkspace,
  deadline: number
): Promise<void> {
  const driver = session.driver;
  await driver.waitForDesignerReady();
  await captureHttpDesignerEvidence(session, entry, deadline, 'http-timeout-request-pt1s-designer-ready', {
    kind: 'designerCanvas',
    label: 'httpTimeoutRequestPt1sDesignerReady',
    allowLoading: false,
  });
  await driver.addRequestTrigger(httpRequestTriggerClickEvidence(deadline));
  await captureHttpDesignerEvidence(session, entry, deadline, 'http-timeout-request-pt1s-request-inserted', {
    kind: 'designerCanvas',
    label: 'httpTimeoutRequestPt1sRequestInserted',
    requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received']],
  });
  await driver.addAction('HTTP', 'HTTP', ['http']);
  await captureHttpDesignerEvidence(session, entry, deadline, 'http-timeout-request-pt1s-http-panel-ready', {
    kind: 'designerPanel',
    label: 'httpTimeoutRequestPt1sHttpPanelReady',
    actionTitle: 'HTTP',
    requiredText: ['Method', 'URI'],
  });
  await driver.selectHttpMethodGet();
  console.log(`[http-timeout][checkpoint] ${entry.wfName}: HTTP Method explicitly selected as GET`);
  await captureHttpDesignerEvidence(session, entry, deadline, 'http-timeout-request-pt1s-method-selected', {
    kind: 'designerPanel',
    label: 'httpTimeoutRequestPt1sMethodSelected',
    actionTitle: 'HTTP',
    requiredText: ['Method', 'URI'],
    fields: [{ labels: ['Method'], value: 'GET' }],
  });
  await driver.fillParameter(['URI'], endpoint);
  console.log(`[http-timeout][checkpoint] ${entry.wfName}: URI entered; capturing exact request URL evidence`);
  await captureHttpDesignerEvidence(session, entry, deadline, 'http-timeout-request-pt1s-uri-configured', {
    kind: 'designerPanel',
    label: 'httpTimeoutRequestPt1sUriConfigured',
    actionTitle: 'HTTP',
    requiredText: ['Method', 'URI'],
    fields: [
      { labels: ['Method'], value: 'GET' },
      { labels: ['URI'], value: endpoint },
    ],
  });
  console.log(`[http-timeout][checkpoint] ${entry.wfName}: exact request URL captured; waiting for HTTP panel Settings readiness`);
  await driver.configureHttpRequestSettings(timeout, {
    timeoutConfigured: async () => {
      console.log(`[http-timeout][checkpoint] ${entry.wfName}: Networking Request options timeout visibly configured as ${timeout}`);
      await captureHttpDesignerEvidence(session, entry, deadline, 'http-timeout-request-pt1s-timeout-configured', {
        kind: 'designerPanel',
        label: 'httpTimeoutRequestPt1sTimeoutConfigured',
        actionTitle: 'HTTP',
        requiredText: ['Settings'],
        fields: [
          {
            labels: ['Request options - Timeout'],
            exactAriaLabel: 'Request options - Timeout',
            sectionTitle: 'Networking',
            value: timeout,
          },
        ],
      });
    },
    asyncPatternDisabled: async () => {
      console.log(`[http-timeout][checkpoint] ${entry.wfName}: exact Asynchronous pattern input scrolled into view and visibly Off`);
      await captureHttpDesignerEvidence(session, entry, deadline, 'http-timeout-request-pt1s-async-pattern-off', {
        kind: 'designerPanel',
        label: 'httpTimeoutRequestPt1sAsyncPatternOff',
        actionTitle: 'HTTP',
        requiredText: ['Settings'],
        switches: [
          {
            labels: ['Asynchronous pattern'],
            exactAriaLabel: 'Asynchronous pattern',
            sectionTitle: 'Networking',
            checked: false,
            stateText: 'Off',
          },
        ],
      });
    },
  });
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
  await captureHttpDesignerEvidence(session, entry, deadline, 'http-timeout-request-pt1s-saved', {
    kind: 'designerCanvas',
    label: 'httpTimeoutRequestPt1sSaved',
    requiredNodes: [['When an HTTP request is received', 'When a HTTP request is received'], 'HTTP'],
  });
}

interface HttpTimeoutUpdateCheckpoints {
  timeoutConfigured?: () => Promise<void>;
  asyncPatternDisabled?: () => Promise<void>;
  persisted?: () => Promise<void>;
}

async function updateHttpRequestTimeout(
  driver: HttpTimeoutComposeDriver,
  endpoint: string,
  timeout: string,
  entry: CreatedWorkspace,
  deadline: number,
  checkpoints: HttpTimeoutUpdateCheckpoints = {}
): Promise<void> {
  await driver.waitForDesignerReady(['When an HTTP request is received', 'When a HTTP request is received']);
  console.log(`[http-timeout][checkpoint] ${entry.wfName}: reopening HTTP panel Settings for timeout ${timeout}`);
  await driver.configureHttpRequestSettings(timeout, {
    timeoutConfigured: async () => {
      console.log(`[http-timeout][checkpoint] ${entry.wfName}: Networking Request options timeout visibly configured as ${timeout}`);
      await checkpoints.timeoutConfigured?.();
    },
    asyncPatternDisabled: async () => {
      console.log(`[http-timeout][checkpoint] ${entry.wfName}: exact Asynchronous pattern input scrolled into view and visibly Off`);
      await checkpoints.asyncPatternDisabled?.();
    },
  });
  await driver.closePanel();
  const saveDeadline = Math.min(deadline, Date.now() + 30_000);
  await pollHttpTimeoutCompose(() => driver.saveEnabled(), Boolean, saveDeadline, `enabled Save after setting HTTP timeout ${timeout}`);
  const priorModifiedAt = fs.statSync(entry.workflowJsonPath).mtimeMs;
  await driver.save();
  const persisted = await pollHttpTimeoutCompose(
    async () => ({
      modifiedAt: fs.statSync(entry.workflowJsonPath).mtimeMs,
      workflow: readWorkflow(entry),
    }),
    (state) => {
      if (state.modifiedAt <= priorModifiedAt) {
        return false;
      }
      try {
        assertHttpTimeoutRequestPersisted(state.workflow, timeout, endpoint);
        return true;
      } catch {
        return false;
      }
    },
    saveDeadline,
    `fresh persisted HTTP timeout ${timeout}`
  );
  assertHttpTimeoutRequestPersisted(persisted.workflow, timeout, endpoint);
  console.log(
    `[http-timeout][checkpoint] ${entry.wfName}: saved HTTP timeout ${timeout} through a fresh workflow.json write ` +
      `(mtime ${priorModifiedAt} -> ${persisted.modifiedAt})`
  );
  await checkpoints.persisted?.();
}

async function captureHttpDesignerEvidence(
  session: DesignerSession,
  entry: CreatedWorkspace,
  deadline: number,
  name: string,
  expectation: ScreenshotExpectation,
  semanticText?: string[]
): Promise<void> {
  console.log(`[http-timeout][checkpoint] capturing ${name}`);
  const capture = (semanticCdp: CdpConnection, semanticContextId: number) =>
    captureEvidenceScreenshot(name, expectation, {
      semanticCdp,
      semanticContextId,
      deadlineMs: Math.min(deadline, Date.now() + defaultEvidenceScreenshotTimeoutMs),
      binding: { activeTabText: [entry.wfName, 'Workspace'], semanticText },
    });
  try {
    await capture(session.cdp, session.contextId);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== 'Screenshot binding failed: semantic frame is not owned by the workbench frame tree'
    ) {
      throw error;
    }
    console.warn(`[http-timeout][checkpoint] ${name}: rebinding screenshot evidence to the visible Designer iframe`);
    const workbench = await connectToVsCodeWorkbenchCdp({
      activate: false,
      timeoutMs: Math.min(15_000, httpTimeoutComposeRemaining(deadline)),
    });
    let reboundCdp: CdpConnection | undefined;
    try {
      const tabs = getWebviewTabs(httpTimeoutComposeDesignerViewType);
      assert.strictEqual(tabs.length, 1, `${name} requires exactly one Designer tab before screenshot rebinding`);
      assert.ok(tabs[0].isActive, `${name} requires the Designer tab to remain active before screenshot rebinding`);
      const rebound = await activeWebview(
        workbench,
        tabs[0].label,
        ['Workflow', 'Code', 'HTTP', ...(semanticText ?? [])],
        Math.min(deadline, Date.now() + defaultEvidenceScreenshotTimeoutMs)
      );
      reboundCdp = rebound.cdp;
      await capture(rebound.cdp, rebound.contextId);
    } finally {
      reboundCdp?.dispose();
      workbench.dispose();
    }
  }
}

function httpRequestTriggerClickEvidence(deadline: number): DesignerInsertionEvidenceHooks {
  return {
    onOperationClick: async (stage, attempt) => {
      const screenshotPath = await captureDiagnosticScreenshot(`http-timeout-request-trigger-click-${attempt}-${stage}-${Date.now()}`, {
        reason: `Request trigger browser input ${stage} attempt ${attempt}; insertion still requires exact node acknowledgement`,
        timeoutMs: Math.min(5000, Math.max(1, deadline - Date.now())),
      });
      assert.ok(screenshotPath, `Request trigger ${stage} input attempt ${attempt} requires its diagnostic screenshot`);
    },
  };
}

async function captureHttpDesignerFailure(stage: string, error: unknown): Promise<void> {
  console.warn(`[http-timeout][checkpoint] ${stage} failed before Designer cleanup: ${String(error)}`);
  await captureDiagnosticScreenshot(`http-timeout-request-${stage}-before-cleanup-${Date.now()}`, {
    reason: `HTTP timeout ${stage} failed while the Designer tab was still open`,
    timeoutMs: 5000,
  });
}

async function proveComposeUnsupportedTimeoutOnSameWorkflow(entry: CreatedWorkspace, endpoint: string, deadline: number): Promise<void> {
  const requestTitles = ['When an HTTP request is received', 'When a HTTP request is received'];
  assertHttpTimeoutRequestPersisted(readWorkflow(entry), 'PT24H', endpoint);

  let session: DesignerSession | undefined;
  let originalOwner: Awaited<ReturnType<HttpTimeoutComposeDriver['context']>> | undefined;
  try {
    const activeSession = await openDesigner(entry, deadline, 'HTTP timeout Compose same-workflow reset');
    session = activeSession;
    await activeSession.driver.waitForDesignerReady(requestTitles);
    assertHttpTimeoutRequestPersisted(readWorkflow(entry), 'PT24H', endpoint);
    await captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-request-scenario-2-complete-before-reset', {
      kind: 'designerCanvas',
      label: 'httpTimeoutRequestScenario2CompleteBeforeReset',
      requiredNodes: [requestTitles, 'HTTP'],
    });

    await activeSession.driver.deleteNode(['HTTP']);
    await activeSession.driver.deleteNode(requestTitles);
    assert.strictEqual(await activeSession.driver.hasNode(['HTTP']), false, 'HTTP must be absent before Compose authoring');
    assert.strictEqual(await activeSession.driver.hasNode(requestTitles), false, 'Request must be absent before Compose authoring');
    await captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-transition-cleared', {
      kind: 'designerCanvas',
      label: 'httpTimeoutTransitionCleared',
      allowLoading: false,
    });

    await activeSession.driver.addRequestTrigger(httpRequestTriggerClickEvidence(deadline));
    await activeSession.driver.addAction('Compose', 'Compose');
    await activeSession.driver.fillParameter(['Inputs'], 'test');
    await activeSession.driver.closePanel();
    await activeSession.driver.save();
    const authored = await pollHttpTimeoutCompose(
      async () => readWorkflow(entry),
      (value) => {
        try {
          assertHttpTimeoutComposeAuthored(value);
          return true;
        } catch {
          return false;
        }
      },
      deadline,
      'same-workflow Request and Compose authoring'
    );
    assertHttpTimeoutComposeAuthored(authored);
    originalOwner = await activeSession.driver.context();
    await captureHttpDesignerEvidence(activeSession, entry, deadline, 'http-timeout-compose-authored', {
      kind: 'designerCanvas',
      label: 'httpTimeoutComposeOriginal',
      requiredNodes: [requestTitles, 'Compose'],
    });
  } catch (error) {
    await captureHttpDesignerFailure('compose-same-workflow-authoring', error);
    throw error;
  } finally {
    session?.dispose();
  }

  assert.ok(originalOwner, 'Same-workflow Compose authoring must retain the original Designer owner');
  const workbench = await connectToVsCodeWorkbenchCdp({
    activate: false,
    timeoutMs: Math.min(15_000, httpTimeoutComposeRemaining(deadline)),
  });
  let reopenedCdp: CdpConnection | undefined;
  try {
    await closeActiveDesignerTab(httpTimeoutComposeDesignerViewType, deadline);
    const nativeCodeBefore = JSON.parse(await openExactExplorerFileInNativeEditor(workbench, entry.workflowJsonPath, deadline));
    assertHttpTimeoutComposeAuthored(nativeCodeBefore);
    await captureEvidenceScreenshot(
      'http-timeout-compose-native-editor-open',
      { kind: 'workbenchShell', label: 'httpTimeoutComposeOriginalNativeEditor' },
      {
        deadlineMs: Math.min(deadline, Date.now() + defaultEvidenceScreenshotTimeoutMs),
        binding: { activeTabText: ['workflow.json'] },
      }
    );
    const expected = replaceHttpTimeoutComposeAction(nativeCodeBefore);
    await pasteJsonValueIntoActiveNativeEditor(
      workbench,
      entry.workflowJsonPath,
      ['definition', 'actions', 'Compose', 'runtimeConfiguration'],
      httpTimeoutComposeAction.runtimeConfiguration,
      deadline
    );
    await captureEvidenceScreenshot(
      'http-timeout-compose-native-editor-replaced',
      { kind: 'workbenchShell', label: 'httpTimeoutComposeOriginalNativeEditorReplaced' },
      {
        deadlineMs: Math.min(deadline, Date.now() + defaultEvidenceScreenshotTimeoutMs),
        binding: { activeTabText: ['workflow.json'] },
      }
    );
    await saveAndCloseActiveNativeEditor(workbench, entry.workflowJsonPath, expected, deadline);
    const persisted = await pollHttpTimeoutCompose(
      async () => readWorkflow(entry),
      (value) => isDeepStrictEqual(value.definition?.actions?.Compose, expected.definition.actions.Compose),
      deadline,
      'same-workflow Compose runtimeConfiguration saved on disk'
    );
    assertHttpTimeoutComposePersisted(persisted, expected);

    const reopenedTab = await openDesignerFromExactExplorerFile(
      workbench,
      entry.workflowJsonPath,
      entry.wfName,
      httpTimeoutComposeDesignerViewType,
      deadline
    );
    const reopened = await activeWebview(workbench, reopenedTab.label, ['Workflow', 'Code', 'Save'], deadline);
    reopenedCdp = reopened.cdp;
    const assertReopenedActive = (): void => {
      const tabs = getWebviewTabs(httpTimeoutComposeDesignerViewType);
      assert.strictEqual(tabs.length, 1, 'No ambiguous/stale reopened Designer webviews');
      assert.strictEqual(tabs[0], reopenedTab, 'Reopened Designer tab changed');
      assert.strictEqual(reopenedTab.isActive, true, 'Reopened same-workflow Designer must be active');
      assert.ok(reopenedTab.label.includes(entry.wfName), 'Wrong reopened workflow Designer');
      httpTimeoutComposeRemaining(deadline);
    };
    const reopenedDriver = new HttpTimeoutComposeDriver(reopened.cdp, reopened.contextId, deadline, assertReopenedActive);
    const reopenedOwner = await reopenedDriver.context();
    assert.notDeepStrictEqual(reopenedOwner, originalOwner, 'Reopened Designer must have a fresh CDP owner');
    assert.notStrictEqual(reopenedOwner.targetId, originalOwner.targetId, 'Reopened Designer must use a fresh CDP target');
    const observation = await pollHttpTimeoutCompose(
      () => reopenedDriver.errorObservation(),
      (value) => value.messages.includes(httpTimeoutComposeError),
      deadline,
      'exact unsupported-timeout message on the same reopened workflow'
    );
    assertHttpTimeoutComposeVisibleError(observation, reopenedOwner);
    assertHttpTimeoutComposePersisted(readWorkflow(entry), expected);
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
        deadlineMs: Math.min(deadline, Date.now() + defaultEvidenceScreenshotTimeoutMs),
        binding: { activeTabText: [entry.wfName, 'Workspace'], semanticText: [httpTimeoutComposeError] },
      }
    );
  } finally {
    reopenedCdp?.dispose();
    workbench.dispose();
    await closeAllTabs();
  }
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
    const active = await activeWebview(workbench, tab.label, ['Workflow', 'Code', 'Save'], deadline, handlePrompt);
    const cdp = active.cdp;
    try {
      const contextId = active.contextId;
      assertApprovedAzureConnectorFixtureSaved(entry.appDir, azureFixture);
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

async function waitForRun(
  entry: CreatedWorkspace,
  runName: string,
  deadline: number
): Promise<{ name: string; status: string; actions: unknown }> {
  const workflowUrl = `${managementRoot}/workflows/${encodeURIComponent(entry.wfName)}`;
  const runUrl = `${workflowUrl}/runs/${encodeURIComponent(runName)}`;
  let status = '';
  let runStatusAttempt = 0;
  await pollHttpTimeoutCompose(
    async () => requestLocalManagementForPoll('run-status', `${runUrl}?api-version=${apiVersion}`, 'GET', deadline, ++runStatusAttempt),
    (result) => {
      if (result.status === 0 || result.status === 404 || result.status === 503) {
        return false;
      }
      assert.strictEqual(result.status, 200);
      status = String((JSON.parse(result.body) as { properties?: { status?: unknown } }).properties?.status ?? '');
      return ['Succeeded', 'Failed', 'Cancelled', 'TimedOut'].includes(status);
    },
    deadline,
    `exact HTTP timeout run ${runName}`
  );
  let actionHistoryAttempt = 0;
  const actions = await pollHttpTimeoutCompose(
    async () =>
      requestLocalManagementForPoll(
        'action-history',
        `${runUrl}/actions?api-version=${apiVersion}`,
        'GET',
        deadline,
        ++actionHistoryAttempt
      ),
    (result) => {
      if (result.status === 0 || result.status === 404 || result.status === 503) {
        return false;
      }
      assert.strictEqual(result.status, 200);
      return true;
    },
    deadline,
    `exact HTTP timeout action history ${runName}`
  );
  return { name: runName, status, actions: JSON.parse(actions.body) };
}

async function openOverview(entry: CreatedWorkspace, deadline: number): Promise<{ cdp: CdpConnection; contextId: number }> {
  await closeAllTabs();
  await vscode.commands.executeCommand('azureLogicAppsStandard.openOverview', vscode.Uri.file(entry.workflowJsonPath));
  await waitForWebviewTab('workflowOverview', 0, Math.min(90_000, httpTimeoutComposeRemaining(deadline)));
  const cdp = await connectToVsCodeCdp({ targetName: 'HTTP timeout Overview webview' });
  try {
    const contextId = await waitForWebviewFrameContext(cdp, {
      allTextIncludes: ['Run trigger', 'Refresh'],
      description: 'HTTP timeout Overview webview DOM context',
      timeoutMs: Math.min(90_000, httpTimeoutComposeRemaining(deadline)),
    });
    return { cdp, contextId };
  } catch (error) {
    cdp.dispose();
    throw error;
  }
}

async function requestLocalManagementForPoll(
  phase: Exclude<LocalWorkflowManagementPhase, 'trigger-invocation'>,
  url: string,
  method: string,
  deadline: number,
  attempt: number
): Promise<LocalWorkflowManagementResult> {
  try {
    return await requestLocalWorkflowManagement({ phase, url, method, deadline, attempt });
  } catch (error) {
    if (isLocalWorkflowManagementTimeout(error)) {
      return { status: 0, body: '', headers: {} };
    }
    throw error;
  }
}
