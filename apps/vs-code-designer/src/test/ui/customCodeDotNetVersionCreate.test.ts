// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Custom-code .NET version E2E — workspace creation (create phase).
 *
 * Drives the REAL Create Workspace webview to create a `Logic app with custom
 * code` + Stateful workspace, targeting either `.NET 8` or `.NET 10`, selected
 * via `CUSTOMCODE_DOTNET_E2E_VERSION` ('net8' | 'net10', default 'net8').
 *
 * This is a create/assert pair, the same shape as
 * azuriteAutostartFailure.test.ts / azuriteAutostartFailureAssert.test.ts and
 * codefulDebugTasksModern/Legacy.test.ts: this file (Phase 4.15A) creates the
 * workspace through the wizard in one fresh VS Code session, and
 * customCodeDotNetVersionAssert.test.ts (Phase 4.15B) reopens the generated
 * `.code-workspace` in a SEPARATE fresh session and asserts the
 * dotnet-version-dependent settings plus a full debug/run lifecycle.
 *
 * DELIBERATELY not manifest-backed: the shared `created-workspaces.json`
 * manifest (workspaceManifest.ts / createWorkspaceShared.ts) already holds a
 * single net8 CustomCode + Stateful entry written by
 * createWorkspace.fixtures.test.ts (Phase 4.1a), with no dotnet-version
 * disambiguation. Appending net8/net10 entries here would collide with that
 * entry and make unrelated scenarios (p42-customcode, p43-customcode, ...)
 * pick an ambiguous or wrong workspace. Instead this pair uses FIXED,
 * deterministic paths/names per version (mirroring
 * azuriteAutostartFailure.test.ts's WORKSPACE_PARENT_DIR/WORKSPACE_NAME
 * constants) so the assert-phase file can independently recompute the exact
 * same layout without any JSON hand-off file.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { strict as assert } from 'assert';
import { By, EditorView, type WebDriver, Workbench } from 'vscode-extension-tester';
import {
  TEST_TIMEOUT,
  buildManifestEntry,
  captureScreenshot,
  clearAndType,
  clickCreateWorkspaceButton,
  deepVerifyWorkspace,
  dismissNotifications,
  dumpFormState,
  fillCustomCodeFields,
  findDropdownByLabel,
  findInputByLabel,
  selectCreateWorkspaceCommand,
  selectDropdownOption,
  selectRadioOption,
  sleep,
  switchToWebviewFrame,
  waitForExtensionReady,
  waitForNextButton,
  waitForPathValidation,
} from './createWorkspaceShared';

/**
 * dotnet target under test. Read at module scope exactly like
 * AZURITE_E2E_APP_KIND: `runPhase()` clears `require.cache` for the compiled
 * test file before each phase, so re-evaluating module scope is what makes
 * the env gate select a different layout on the next phase.
 */
const DOTNET_TARGETS = ['net8', 'net10'] as const;
type DotNetTarget = (typeof DOTNET_TARGETS)[number];
const RAW_TARGET = (process.env.CUSTOMCODE_DOTNET_E2E_VERSION || 'net8').toLowerCase();
if (!(DOTNET_TARGETS as readonly string[]).includes(RAW_TARGET)) {
  throw new Error(
    `CUSTOMCODE_DOTNET_E2E_VERSION must be one of ${DOTNET_TARGETS.join(' | ')}; got "${process.env.CUSTOMCODE_DOTNET_E2E_VERSION}"`
  );
}
const TARGET = RAW_TARGET as DotNetTarget;

/** Wizard dropdown option label (apps/vs-code-react/src/intl/messages.ts). */
const DOTNET_VERSION_LABEL = TARGET === 'net10' ? '.NET 10' : '.NET 8';

/**
 * Per-version fixed layout. Byte-for-byte identical to the constants block in
 * customCodeDotNetVersionAssert.test.ts — keep the two files' tables in sync.
 * Disjoint in BOTH the parent directory and every generated name so the two
 * targets can never collide on disk or inside a `.code-workspace`, and so a
 * stale directory from a previous local run cannot leak into either target.
 */
const WORKSPACE_PARENT_DIR = path.join(os.tmpdir(), 'la-e2e-test', `customcode-dotnet-${TARGET}-parent`);
const WORKSPACE_NAME = `cc${TARGET}ws`;
const APP_NAME = `cc${TARGET}app`;
const WORKFLOW_NAME = `cc${TARGET}wf`;
const CC_FOLDER_NAME = `cc${TARGET}folder`;
const FN_NAME = `cc${TARGET}fn`;
const FN_NAMESPACE = 'MyCompany.Functions';

const LOG_PREFIX = `[customcode-dotnet-e2e][4.15A][${TARGET}]`;
function log(message: string): void {
  console.log(`${LOG_PREFIX} ${message}`);
}

// Module-scope banner: prints during Mocha's file load, so `--dry-run` (and every CI
// run) records exactly which layout this phase resolved. Cheap insurance against the
// create and assert phases silently disagreeing about a path.
log(`layout: target=${TARGET} label="${DOTNET_VERSION_LABEL}" parent=${WORKSPACE_PARENT_DIR} ws=${WORKSPACE_NAME} app=${APP_NAME}`);

describe(`Create Workspace: CustomCode dotnet version (${TARGET})`, function () {
  this.timeout(TEST_TIMEOUT);

  let workbench: Workbench;
  let driver: WebDriver;

  before(async function () {
    this.timeout(600_000);
    workbench = new Workbench();
    driver = workbench.getDriver();
    log('Waiting for extension to be ready...');
    await waitForExtensionReady(workbench);
    log('Extension is ready');

    // Clear any stale workspace from a previous local run so this run starts fresh —
    // mirrors azuriteAutostartFailure.test.ts's stale-manifest cleanup.
    try {
      fs.rmSync(WORKSPACE_PARENT_DIR, { recursive: true, force: true });
      log(`Cleared stale parent dir: ${WORKSPACE_PARENT_DIR}`);
    } catch {
      /* ignore */
    }
    fs.mkdirSync(WORKSPACE_PARENT_DIR, { recursive: true });
  });

  afterEach(async function () {
    if (this.currentTest?.state === 'failed') {
      try {
        const failName = (this.currentTest.title || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 80);
        await captureScreenshot(driver, `FAIL-customcode-dotnet-create-${TARGET}-${failName}`);
      } catch {
        /* ignore */
      }
    }
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    try {
      await dismissNotifications(driver);
    } catch {
      /* ignore */
    }
    try {
      await sleep(1000);
      await new EditorView().closeAllEditors();
    } catch {
      /* ignore */
    }
    await sleep(1000);
  });

  it(TARGET === 'net10'
    ? 'does not show .NET 10 for custom code'
    : `creates a CustomCode + Stateful workspace targeting ${DOTNET_VERSION_LABEL}`, async () => {
    log('Opening Create Workspace command...');
    await selectCreateWorkspaceCommand(workbench);

    log('Switching to webview...');
    const webview = await switchToWebviewFrame(driver);

    log('Filling workspace fields...');
    const pathInput = await findInputByLabel(driver, 'Workspace parent folder path');
    await clearAndType(pathInput, WORKSPACE_PARENT_DIR);
    await waitForPathValidation(driver);

    const wsNameInput = await findInputByLabel(driver, 'Workspace name');
    await clearAndType(wsNameInput, WORKSPACE_NAME);

    const appNameInput = await findInputByLabel(driver, 'Logic app name');
    await clearAndType(appNameInput, APP_NAME);

    log('Selecting custom code radio...');
    await selectRadioOption(driver, 'Logic app with custom code');
    await sleep(2000);

    if (TARGET === 'net10') {
      const dotNetDropdown = await findDropdownByLabel(driver, '.NET Version');
      await driver.actions().move({ origin: dotNetDropdown }).click().perform();
      await sleep(500);
      const optionTexts = await Promise.all(
        (await driver.findElements(By.css('[role="option"]'))).map((option) => option.getText().catch(() => ''))
      );
      assert.ok(
        optionTexts.some((option) => option.includes('.NET 8')),
        `.NET 8 should remain available. Options: ${optionTexts.join(', ')}`
      );
      assert.ok(
        !optionTexts.some((option) => option.includes('.NET 10')),
        `.NET 10 should not appear for custom code. Options: ${optionTexts.join(', ')}`
      );
      await captureScreenshot(driver, 'customcode-dotnet-net10-hidden-passed');
      log('PASSED: .NET 10 is hidden from the custom-code framework picker');
      return;
    }

    log(`Selecting dotnet version "${DOTNET_VERSION_LABEL}"...`);
    await fillCustomCodeFields(driver, {
      dotNetVersion: DOTNET_VERSION_LABEL,
      folderName: CC_FOLDER_NAME,
      namespace: FN_NAMESPACE,
      functionName: FN_NAME,
    });

    const wfNameInput = await findInputByLabel(driver, 'Workflow name');
    await clearAndType(wfNameInput, WORKFLOW_NAME);

    const wfTypeDropdown = await findDropdownByLabel(driver, 'Workflow type');
    await selectDropdownOption(driver, wfTypeDropdown, 'Stateful');

    await dumpFormState(driver);
    const nextButton = await waitForNextButton(driver);
    await nextButton.click();
    await sleep(2000);

    await clickCreateWorkspaceButton(driver, webview, { parentDir: WORKSPACE_PARENT_DIR, wsName: WORKSPACE_NAME });

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

    // Deep-verify the wizard output on disk (folders, workflow.json shape,
    // host.json/local.settings.json presence, function .cs/.csproj presence).
    // Retried the same way createWorkspace.fixtures.test.ts's waitForManifestShape
    // retries: file-system writes triggered by the "Create workspace" click can
    // trail the button click by a second or two.
    const deadline = Date.now() + 60_000;
    let lastError: unknown;
    let verified = false;
    while (Date.now() < deadline) {
      try {
        deepVerifyWorkspace(WORKSPACE_PARENT_DIR, {
          wsName: WORKSPACE_NAME,
          appName: APP_NAME,
          wfName: WORKFLOW_NAME,
          appType: 'customCode',
          wfType: 'Stateful',
          ccFolderName: CC_FOLDER_NAME,
          fnName: FN_NAME,
          fnNamespace: FN_NAMESPACE,
        });
        verified = true;
        break;
      } catch (error: unknown) {
        lastError = error;
        await sleep(500);
      }
    }
    if (!verified) {
      const message = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(`[customcode-dotnet-e2e] Timed out waiting for workspace shape: ${message}`);
    }

    const csprojPath = path.join(entry.wsDir, CC_FOLDER_NAME, `${FN_NAME}.csproj`);
    const csprojContent = fs.readFileSync(csprojPath, 'utf8');
    const expectedTargetFramework = TARGET === 'net10' ? 'net10.0' : 'net8';
    if (!csprojContent.includes(`<TargetFramework>${expectedTargetFramework}</TargetFramework>`)) {
      throw new Error(`Expected ${csprojPath} to target ${expectedTargetFramework}`);
    }

    log(`Workspace created at ${entry.wsFilePath}`);
    await captureScreenshot(driver, `customcode-dotnet-create-${TARGET}-passed`);
    log('PASSED');
  });
});
