// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Custom-code .NET version E2E — assertion + full debug/run lifecycle (assert
 * phase).
 *
 * Phase 4.15B. Reopens the `.code-workspace` created by
 * customCodeDotNetVersionCreate.test.ts (Phase 4.15A) in a fresh VS Code
 * session, selected via the same `CUSTOMCODE_DOTNET_E2E_VERSION` env var
 * ('net8' | 'net10', default 'net8'), and asserts:
 *
 *   1. The Logic App root `local.settings.json` has
 *      `LOGIC_APPS_CUSTOMCODE_DOTNETVERSION` set to the exact value the
 *      product writes for this target ('net8' | 'net10.0' — see
 *      TargetFramework in libs/vscode-extension/src/lib/models/workflow.ts).
 *   2. For net10 only: the generated function project's `.csproj` pins
 *      `Microsoft.ApplicationInsights.WorkerService` to `Version="2.21.0"`.
 *   3. A full debug/run lifecycle, not merely host-start: build succeeds,
 *      the workflow reaches Healthy, a callback URL becomes available, the
 *      Request trigger is invoked, run history reaches Succeeded, and
 *      action-level evidence shows the generated InvokeFunction
 *      ("Call_a_local_function_in_this_logic_app") action specifically
 *      succeeded — not just "some action succeeded".
 *
 * The default CustomCode wizard workflow already contains this InvokeFunction
 * action wired to a Request trigger + Response action (see
 * apps/vs-code-designer/src/app/utils/codeless/templates.ts,
 * getCodelessWorkflowTemplate, ProjectType.customCode branch), so no manual
 * designer interaction is needed to produce action-level evidence — the
 * as-created workflow already exercises the generated local function.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EditorView, type WebDriver, Workbench } from 'vscode-extension-tester';
import { buildManifestEntry, sleep } from './createWorkspaceShared';
import { openWorkspaceFileInSession, waitForDependencyValidation } from './designerHelpers';
import {
  assertRunTriggerable,
  clickLatestRunRow,
  clickRefresh,
  invokeWorkflowCallback,
  startDebugging,
  stopDebugging,
  verifyAllNodesSucceeded,
  verifyLatestRunActionRunsSucceeded,
  waitForOverviewView,
  waitForRunStatusInList,
  waitForRuntimeReady,
} from './runHelpers';

const TEST_TIMEOUT = 900_000;
const RUNTIME_READY_TIMEOUT = 420_000;

/** Name of the InvokeFunction action baked into the default CustomCode wizard workflow. */
const INVOKE_FUNCTION_ACTION_NAME = 'Call_a_local_function_in_this_logic_app';

const DOTNET_TARGETS = ['net8', 'net10'] as const;
type DotNetTarget = (typeof DOTNET_TARGETS)[number];
const RAW_TARGET = (process.env.CUSTOMCODE_DOTNET_E2E_VERSION || 'net8').toLowerCase();
if (!(DOTNET_TARGETS as readonly string[]).includes(RAW_TARGET)) {
  throw new Error(
    `CUSTOMCODE_DOTNET_E2E_VERSION must be one of ${DOTNET_TARGETS.join(' | ')}; got "${process.env.CUSTOMCODE_DOTNET_E2E_VERSION}"`
  );
}
const TARGET = RAW_TARGET as DotNetTarget;

/**
 * Exact LOGIC_APPS_CUSTOMCODE_DOTNETVERSION value the product writes for this
 * target — TargetFramework.Net8 = 'net8', TargetFramework.Net10 = 'net10.0'
 * (libs/vscode-extension/src/lib/models/workflow.ts). NOT 'net10' — the
 * enum's Net10 value carries the trailing '.0'.
 */
const EXPECTED_DOTNET_SETTING = TARGET === 'net10' ? 'net10.0' : 'net8';

/**
 * Per-version fixed layout. Byte-for-byte identical to the constants block in
 * customCodeDotNetVersionCreate.test.ts — keep the two files' tables in sync.
 */
const WORKSPACE_PARENT_DIR = path.join(os.tmpdir(), 'la-e2e-test', `customcode-dotnet-${TARGET}-parent`);
const WORKSPACE_NAME = `cc${TARGET}ws`;
const APP_NAME = `cc${TARGET}app`;
const WORKFLOW_NAME = `cc${TARGET}wf`;
const CC_FOLDER_NAME = `cc${TARGET}folder`;
const FN_NAME = `cc${TARGET}fn`;
const FN_NAMESPACE = 'MyCompany.Functions';

const entry = buildManifestEntry(`CustomCode + Stateful (${TARGET})`, WORKSPACE_PARENT_DIR, {
  wsName: WORKSPACE_NAME,
  appName: APP_NAME,
  wfName: WORKFLOW_NAME,
  appType: 'customCode',
  wfType: 'Stateful',
  ccFolderName: CC_FOLDER_NAME,
  fnName: FN_NAME,
  fnNamespace: FN_NAMESPACE,
});

const LOG_PREFIX = `[customcode-dotnet-e2e][4.15B][${TARGET}]`;
function log(message: string): void {
  console.log(`${LOG_PREFIX} ${message}`);
}

log(`layout: target=${TARGET} expectedSetting=${EXPECTED_DOTNET_SETTING} wsFile=${entry.wsFilePath} appDir=${entry.appDir}`);

interface LocalSettingsJson {
  Values?: Record<string, string>;
  [key: string]: unknown;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) as T;
}

/**
 * Assert the Logic App root local.settings.json carries the dotnet-version
 * setting the product writes for CustomCode + Net8/Net10 (addCustomCodeDotNetVersionSetting
 * in apps/vs-code-designer/src/app/utils/appSettings/localSettings.ts).
 * Polled because the setting is written synchronously during wizard "Create workspace",
 * but this assertion runs in a freshly reopened session where the file has already
 * settled — the poll only guards against a slow disk flush on cold CI runners.
 */
async function assertCustomCodeDotNetVersionSetting(): Promise<void> {
  const localSettingsPath = path.join(entry.appDir, 'local.settings.json');
  const deadline = Date.now() + 30_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      assert.ok(fs.existsSync(localSettingsPath), `local.settings.json should exist at ${localSettingsPath}`);
      const settings = readJsonFile<LocalSettingsJson>(localSettingsPath);
      const actual = settings.Values?.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION;
      assert.strictEqual(
        actual,
        EXPECTED_DOTNET_SETTING,
        `local.settings.json Values.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION should be "${EXPECTED_DOTNET_SETTING}" for target "${TARGET}", got "${actual}"`
      );
      log(`local.settings.json LOGIC_APPS_CUSTOMCODE_DOTNETVERSION="${actual}" ✔`);
      return;
    } catch (error: unknown) {
      lastError = error;
      await sleep(500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * net10-only: assert the generated function project's .csproj pins
 * Microsoft.ApplicationInsights.WorkerService to Version="2.21.0" (reverted
 * from 2.23.0 — see apps/vs-code-designer/src/assets/FunctionProjectTemplate/
 * net10's FunctionsProjNet10 template).
 */
function assertApplicationInsightsWorkerServiceVersion(): void {
  const csprojPath = path.join(entry.wsDir, CC_FOLDER_NAME, `${FN_NAME}.csproj`);
  assert.ok(fs.existsSync(csprojPath), `Function project .csproj should exist at ${csprojPath}`);
  const csprojContent = fs.readFileSync(csprojPath, 'utf-8');
  const pattern = /<PackageReference\s+Include="Microsoft\.ApplicationInsights\.WorkerService"\s+Version="([^"]+)"/;
  const match = csprojContent.match(pattern);
  assert.ok(match, `.csproj should reference Microsoft.ApplicationInsights.WorkerService. Content:\n${csprojContent}`);
  assert.strictEqual(match![1], '2.21.0', `Microsoft.ApplicationInsights.WorkerService Version should be "2.21.0", got "${match![1]}"`);
  log(`.csproj Microsoft.ApplicationInsights.WorkerService Version="${match![1]}" ✔`);
}

interface WorkflowJson {
  definition?: {
    triggers?: Record<string, { type?: string; kind?: string }>;
    actions?: Record<string, { type?: string; kind?: string }>;
  };
  kind?: string;
}

/**
 * Lightweight shape check on the as-created workflow.json — verifies it still
 * has a Request trigger and the InvokeFunction action the rest of this test
 * depends on for action-level evidence. Unlike nugetDebugConversion.test.ts's
 * private `assertRunnableWorkflow`, this does not hardcode the trigger's KEY
 * name (the CustomCode wizard template uses "When_a_HTTP_request_is_received",
 * not "manual") — it checks trigger TYPE only, which is the actual contract.
 */
function assertRunnableCustomCodeWorkflow(): void {
  const workflowJsonPath = path.join(entry.wfDir, 'workflow.json');
  assert.ok(fs.existsSync(workflowJsonPath), 'workflow.json should exist');
  const workflowJson = readJsonFile<WorkflowJson>(workflowJsonPath);
  const triggers = workflowJson.definition?.triggers ?? {};
  const actions = workflowJson.definition?.actions ?? {};
  const hasRequestTrigger = Object.values(triggers).some((t) => t.type === 'Request');
  assert.ok(hasRequestTrigger, `workflow should have a Request trigger. Triggers: ${JSON.stringify(triggers)}`);
  assert.ok(
    Object.prototype.hasOwnProperty.call(actions, INVOKE_FUNCTION_ACTION_NAME),
    `workflow should have the "${INVOKE_FUNCTION_ACTION_NAME}" InvokeFunction action. Actions: ${JSON.stringify(Object.keys(actions))}`
  );
  assert.strictEqual(
    actions[INVOKE_FUNCTION_ACTION_NAME]?.type,
    'InvokeFunction',
    `"${INVOKE_FUNCTION_ACTION_NAME}" should be an InvokeFunction action`
  );
}

describe(`Assert Workspace: CustomCode dotnet version (${TARGET})`, function () {
  this.timeout(TEST_TIMEOUT);

  it(`reopens the ${TARGET} workspace, asserts dotnet-version settings, and runs the workflow to Succeeded`, async () => {
    assert.ok(
      fs.existsSync(entry.wsFilePath),
      `Expected Phase 4.15A to have created ${entry.wsFilePath} — the customCodeDotNetVersionCreate.test.ts (target=${TARGET}) phase must run first`
    );

    const workbench = new Workbench();
    const driver: WebDriver = workbench.getDriver();

    await openWorkspaceFileInSession(workbench, entry.wsFilePath);
    if (process.env.LA_E2E_SKIP_VALIDATION_WAIT !== '1') {
      await waitForDependencyValidation(driver);
    }

    // --- Assertions that do not require a running host ---
    assertRunnableCustomCodeWorkflow();
    await assertCustomCodeDotNetVersionSetting();
    if (TARGET === 'net10') {
      assertApplicationInsightsWorkerServiceVersion();
    }

    // --- Full debug/run lifecycle ---
    await startDebugging(workbench, driver);

    assert.ok(
      await waitForRuntimeReady(driver, {
        requireHostRunning: true,
        timeoutMs: RUNTIME_READY_TIMEOUT,
        workspacePaths: [entry.appDir],
      }),
      'build should succeed and the Functions host should start running'
    );

    const overview = await waitForOverviewView(workbench, driver, path.join(entry.wfDir, 'workflow.json'), { timeoutMs: 120_000 });
    try {
      // assertRunTriggerable proves: workflow health.state reaches Healthy
      // (waitForWorkflowsRegistered), a callback URL becomes available
      // (waitForRunTriggerEnabled -> listCallbackUrl), and the Request trigger
      // is invoked (clicks "Run trigger").
      await assertRunTriggerable(driver, { workflowName: entry.wfName });
      await clickRefresh(driver);

      let { found: succeeded, lastStatus } = await waitForRunStatusInList(driver, 'Succeeded', 180_000);
      if (!succeeded) {
        log(`overview Run trigger did not show a succeeded run (last status: "${lastStatus}"); invoking callback URL directly`);
        assert.ok(
          await invokeWorkflowCallback(driver, { workflowName: entry.wfName, body: { source: 'customcode-dotnet-e2e' } }),
          'callback URL invocation should succeed'
        );
        ({ found: succeeded, lastStatus } = await waitForRunStatusInList(driver, 'Succeeded', 60_000));
      }
      assert.ok(succeeded, `run history should reach Succeeded (last status: "${lastStatus}")`);

      const openedRun = await clickLatestRunRow(driver);
      assert.ok(openedRun, 'should be able to open the latest (succeeded) run');

      const { allSucceeded, details } = await verifyAllNodesSucceeded(driver, entry.wfName, 60_000);
      assert.ok(allSucceeded, `all action nodes should be succeeded (${details})`);

      // Explicit action-NAME-level evidence: query the management API directly
      // (regardless of which internal path verifyAllNodesSucceeded took) and
      // assert the generated InvokeFunction action specifically succeeded —
      // proving the local-function/custom-code action ran, not just "some
      // action succeeded".
      const actionResult = await verifyLatestRunActionRunsSucceeded(entry.wfName);
      assert.ok(actionResult, 'management API should return per-action run statuses for the latest run');
      assert.ok(
        new RegExp(`${INVOKE_FUNCTION_ACTION_NAME}:Succeeded`, 'i').test(actionResult!.details),
        `"${INVOKE_FUNCTION_ACTION_NAME}" action should have status Succeeded (${actionResult!.details})`
      );
      log(`Action-level evidence: ${actionResult!.details}`);
    } finally {
      await overview.switchBack().catch(() => undefined);
      await driver
        .switchTo()
        .defaultContent()
        .catch(() => undefined);
      await new EditorView().closeAllEditors().catch(() => undefined);
      await sleep(1000);
      await stopDebugging(driver);
    }

    log('PASSED');
  });
});
