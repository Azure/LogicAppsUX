// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Azurite auto-start failure workspace creation E2E.
 *
 * Phase 4.13A uses this file with AZURITE_E2E_STEP=create to create the real
 * workspace through the Create Workspace webview. Debug assertion coverage lives
 * in azuriteAutostartFailureAssert.test.ts (Phase 4.13B), which reopens the
 * generated workspace in a fresh VS Code session.
 *
 * IMPORTANT — this file deliberately owns NO webview automation of its own.
 * Every interaction below delegates to `createWorkspaceShared.ts`, the same
 * module that drives Phase 4.1a/4.1b/4.10A. An earlier revision hand-rolled its
 * own copies of `selectCreateWorkspaceCommand` / iframe switching / form filling
 * and failed on its very first CI run, because those copies predated the
 * hardening that landed in the shared module. Two distinct symptoms, one cause:
 *
 *   - `ElementNotInteractableError` thrown from `InputBox.clear` <- `setText`.
 *   - `TimeoutError: Waiting until element is visible` from `getQuickPicks()`.
 *
 * Both mean "Create new logic app workspace..." was not registered in the palette
 * yet. The contributing defects, each fixed by deleting the fork:
 *
 *   1. No warm-up gate at all. The palette was opened at t≈0 while the extension
 *      was still downloading the .NET SDK / Functions Core Tools / NodeJS / the
 *      workflows bundle, so the command did not exist and the pick loop matched
 *      nothing. The whole phase failed in 9 seconds.
 *   2. The no-match fallback called `InputBox.setText()` a second time on the
 *      *same* palette handle. ExTester's `setText()` calls `clear()` first, and by
 *      then VS Code had torn the quick-input widget down (notification toasts
 *      steal focus and close it) — hence `ElementNotInteractableError`.
 *
 * The shared module solves (2): it bypasses `InputBox.setText()` with
 * visibility/enabled-checked raw `sendKeys`, reopens a *fresh* palette for the
 * fallback search, and retries 5x with [1s,2s,3s,5s,8s] backoff. The `before()`
 * hook below solves (1). Keep it that way — do not reintroduce local copies of
 * these primitives.
 *
 * NOTE on the warm-up gate: `createWorkspace.fixtures.test.ts` additionally calls
 * `validateDependenciesThroughProductCommand()` + `waitForWorkflowsBundleSidecarReady()`,
 * but those are private to that test file AND gated behind
 * `LA_E2E_STRICT_DEPENDENCY_VALIDATION === '1'`, which only the `setup-fixtures`
 * and `setup-runtime-deps-windows` jobs set — not this one. In the sharded jobs
 * where Phase 4.1 is green it runs `waitForExtensionReady()` and nothing else.
 * So this file uses the equivalent *shared, exported* gate from
 * `designerHelpers.ts` instead of importing from another test file (which would
 * register that file's `describe()` blocks into this phase).
 *
 * APP KIND — `AZURITE_E2E_APP_KIND` selects `codeless` (default) or `codeful`.
 * The Azurite readiness contract is app-kind agnostic in the product:
 * `pickFuncProcessInternal` calls `activateAzurite` unconditionally as its FIRST
 * statement (pickFuncProcess.ts:85), long before the `hasCodefulWorkflowSetting`
 * branch that runs `publishCodefulProject` (pickFuncProcess.ts:109-119) and before
 * the `isCodeless` read at pickFuncProcess.ts:142. So a codeful F5 traverses the
 * exact same readiness code path, and it must fail BEFORE the expensive codeful
 * publish/build — which is what Phase 4.13B additionally asserts for `codeful`.
 * Every kind gets its own workspace parent / workspace name / logic app name so
 * the two runs can never collide on disk or inside a `.code-workspace`.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { type WebDriver, type WebElement, Workbench } from 'vscode-extension-tester';
import {
  clickCreateWorkspaceButton,
  deepVerifyWorkspace,
  fillStandardFormFields,
  selectCreateWorkspaceCommand,
  sleep,
  switchToWebviewFrame,
  verifyWorkspaceOnDisk,
  waitForCreateWorkspaceFormReady,
  waitForExtensionReady,
  waitForNextButton,
} from './createWorkspaceShared';
import { waitForExtensionValidationComplete } from './designerHelpers';
import { captureScreenshot, clearBlockingUI } from './helpers';

/**
 * Generous budget: on a cold runner Phase 4.13A is the first session of the
 * `azuriteonly` mode and runs with validateDependencies=true, so it pays for the
 * full func/dotnet/node/bundle bootstrap before the palette command even exists.
 */
const TEST_TIMEOUT = 600_000;
const EXTENSION_READY_TIMEOUT = 240_000;
/**
 * Capped below designerHelpers' 300s default so the worst-case warm-up
 * (240s ready + 240s settle ≈ 8 min) still leaves room for Phase 4.13B inside the
 * job's 30-minute budget.
 */
const DEPENDENCY_SETTLE_TIMEOUT = 240_000;

/**
 * App kind under test. Read at module scope exactly like `AZURITE_E2E_STEP`, because
 * `runPhase()` clears `require.cache` for the compiled test file before each phase, so
 * re-evaluating module scope is what makes the env gate select a different body.
 *
 * Unknown values throw rather than silently falling back to `codeless`: only the
 * launcher sets this, so a bad value is a harness bug that must be loud, not a run that
 * quietly re-tests the kind we already cover.
 */
const APP_KINDS = ['codeless', 'codeful'] as const;
type AzuriteAppKind = (typeof APP_KINDS)[number];
const E2E_APP_KIND = (process.env.AZURITE_E2E_APP_KIND || 'codeless').toLowerCase();
if (!(APP_KINDS as readonly string[]).includes(E2E_APP_KIND)) {
  throw new Error(`AZURITE_E2E_APP_KIND must be one of ${APP_KINDS.join(' | ')}; got "${process.env.AZURITE_E2E_APP_KIND}"`);
}
const APP_KIND = E2E_APP_KIND as AzuriteAppKind;
const IS_CODEFUL = APP_KIND === 'codeful';

/**
 * Per-kind layout. The codeless values are byte-for-byte the historical ones, so an
 * unset `AZURITE_E2E_APP_KIND` reproduces the previous run exactly. The codeful values
 * are disjoint in BOTH the parent directory and the workspace/app names, so the two
 * runs cannot collide on disk, in the generated `.code-workspace`, or in the
 * `workflow-designtime` folder the launcher clears between 4.13A and 4.13B.
 */
const DEFAULT_WORKSPACE_PARENT_DIR = path.join(
  os.tmpdir(),
  'la-e2e-test',
  IS_CODEFUL ? 'azurite-autostart-failure-codeful-parent' : 'azurite-autostart-failure-parent'
);
const WORKSPACE_PARENT_DIR = process.env.AZURITE_E2E_WORKSPACE_PARENT ?? DEFAULT_WORKSPACE_PARENT_DIR;
// These names are load-bearing: run-e2e.ts checks for
// `${AZURITE_E2E_WORKSPACE_PARENT}/${WORKSPACE_NAME}/${WORKSPACE_NAME}.code-workspace`
// before it will run Phase 4.13B, and azuriteAutostartFailureAssert.test.ts derives
// WORKSPACE_DIR / PROJECT_DIR / DESIGN_TIME_DIR from the same values. Keep the two
// files' tables identical.
const WORKSPACE_NAME = IS_CODEFUL ? 'azuritecfws' : 'azuritews';
const APP_NAME = IS_CODEFUL ? 'azuritecfapp' : 'azuriteapp';
const WORKFLOW_NAME = IS_CODEFUL ? 'cfworkflow1' : 'workflow1';
// Wizard radio label. `fillStandardFormFields` takes the DISPLAY label, not the short
// manifest kind (see createWorkspace.behavior.test.ts:2580 for the codeful label).
const APP_TYPE_LABEL = IS_CODEFUL ? 'Logic app (codeful)' : 'Logic app (Standard)';
const WORKSPACE_DIR = path.join(WORKSPACE_PARENT_DIR, WORKSPACE_NAME);
const PROJECT_DIR = path.join(WORKSPACE_DIR, APP_NAME);
const WORKSPACE_FILE = path.join(WORKSPACE_DIR, `${WORKSPACE_NAME}.code-workspace`);
const LOCAL_SETTINGS_FILE = path.join(PROJECT_DIR, 'local.settings.json');
// Only codeful generates a .csproj next to local.settings.json; a codeful project has
// NO `<wfName>/workflow.json` at all (createWorkspaceShared.ts:1430-1448).
const CSPROJ_FILE = path.join(PROJECT_DIR, `${APP_NAME}.csproj`);
const WORKFLOW_CODEFUL_ENABLED_KEY = 'WORKFLOW_CODEFUL_ENABLED';
const E2E_STEP = (process.env.AZURITE_E2E_STEP || 'create').toLowerCase();
const IS_CREATE_STEP = E2E_STEP === 'create';
const EXPLICIT_SCREENSHOT_DIR = path.join(
  process.env.TEMP || process.cwd(),
  'test-resources',
  'screenshots',
  IS_CODEFUL ? 'azuriteAutostartFailure-create-codeful' : 'azuriteAutostartFailure-create',
  new Date().toISOString().replace(/[:.]/g, '-')
);

const LOG_PREFIX = `[azurite-e2e][4.13A][${APP_KIND}]`;

function log(message: string): void {
  console.log(`${LOG_PREFIX} ${message}`);
}

// Module-scope banner: prints during Mocha's file load, so `--dry-run` (and every CI
// run) records exactly which layout this phase resolved. Cheap insurance against the two
// phases silently disagreeing about a path.
log(
  `layout: step=${E2E_STEP} kind=${APP_KIND} appType="${APP_TYPE_LABEL}" isCodeless=${!IS_CODEFUL} workspaceFile=${WORKSPACE_FILE} projectDir=${PROJECT_DIR}`
);

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Screenshot + log every major step so the next CI failure is self-diagnosing.
 * The workflow uploads `${runner.temp}/test-resources/screenshots/` on always(),
 * and this job exports TEMP=${{ runner.temp }}, so these land in the artifact.
 */
let stepCounter = 0;
async function step(driver: WebDriver, label: string): Promise<void> {
  stepCounter += 1;
  const tag = `${String(stepCounter).padStart(2, '0')}-${label}`;
  log(`step ${tag}`);
  await captureScreenshot(driver, `azurite-create-${tag}`, EXPLICIT_SCREENSHOT_DIR);
}

/**
 * SKILL.md rule 3: direct `element.click()` does not dispatch the native events
 * React's synthetic event system listens for inside a webview iframe, so clicks on
 * React elements go through the Actions API. We still fall back to `element.click()`
 * because that is what the green Phase 4.1a fixtures path uses for this same button.
 */
async function clickReactElement(driver: WebDriver, element: WebElement, label: string): Promise<void> {
  try {
    await driver.executeScript('arguments[0].scrollIntoView({ block: "center" });', element);
  } catch {
    // Non-fatal: the element may already be in view.
  }

  try {
    await driver.actions().move({ origin: element }).click().perform();
    log(`Clicked "${label}" via the Selenium Actions API`);
    return;
  } catch (error) {
    log(`Actions-API click on "${label}" failed (${error}); falling back to element.click()`);
  }

  await element.click();
  log(`Clicked "${label}" via element.click()`);
}

function describeDirectory(directory: string): string {
  try {
    return fs.existsSync(directory) ? JSON.stringify(fs.readdirSync(directory)) : '(does not exist)';
  } catch (error) {
    return `(unreadable: ${error})`;
  }
}

/**
 * Detection-based wait for the artifacts Phase 4.13B needs, rather than a static
 * sleep. `clickCreateWorkspaceButton` only proves the workspace *directory*
 * appeared; `configureGeneratedWorkspaceForAzuriteFailure` additionally reads
 * local.settings.json, which the extension writes slightly later.
 */
async function waitForWorkspaceArtifacts(timeoutMs = 60_000): Promise<void> {
  // Codeful has no `<wfName>/workflow.json`; its project-shaped evidence is the
  // generated `<appName>.csproj` (createWorkspaceShared.ts:1430-1448). Waiting on it
  // keeps the codeful phase from configuring a half-written project.
  const required = [WORKSPACE_FILE, PROJECT_DIR, LOCAL_SETTINGS_FILE, ...(IS_CODEFUL ? [CSPROJ_FILE] : [])];
  const deadline = Date.now() + timeoutMs;
  let missing: string[] = required;

  while (Date.now() < deadline) {
    missing = required.filter((target) => !fs.existsSync(target));
    if (missing.length === 0) {
      log(`All expected workspace artifacts exist under ${WORKSPACE_DIR}`);
      return;
    }
    await sleep(500);
  }

  throw new Error(
    `Create Workspace webview did not produce ${missing.join(', ')} within ${timeoutMs}ms. ` +
      `Parent contents: ${describeDirectory(WORKSPACE_PARENT_DIR)}; ` +
      `workspace contents: ${describeDirectory(WORKSPACE_DIR)}; ` +
      `logic app contents: ${describeDirectory(PROJECT_DIR)}`
  );
}

/**
 * Drive the real Create Workspace webview, mirroring the green Phase 4.1a
 * "should create Standard + Stateful workspace" fixture step for step.
 */
async function createWorkspaceFromWebview(workbench: Workbench, driver: WebDriver): Promise<void> {
  await removeWorkspaceParent();
  fs.mkdirSync(WORKSPACE_PARENT_DIR, { recursive: true });
  log(`Workspace parent:        ${WORKSPACE_PARENT_DIR}`);
  log(`Expected workspace file: ${WORKSPACE_FILE}`);
  log(`Expected logic app dir:  ${PROJECT_DIR}`);

  await step(driver, 'before-command-palette');
  log('Opening the "Create new logic app workspace..." command...');
  await selectCreateWorkspaceCommand(workbench);

  await step(driver, 'after-command-selected');
  log('Switching into the Create Workspace webview iframe...');
  const webview = await switchToWebviewFrame(driver);
  await waitForCreateWorkspaceFormReady(driver);
  await step(driver, 'form-ready');

  log(`Filling the form: workspace="${WORKSPACE_NAME}", logic app="${APP_NAME}", workflow="${WORKFLOW_NAME}"`);
  await fillStandardFormFields(driver, WORKSPACE_PARENT_DIR, {
    wsName: WORKSPACE_NAME,
    appName: APP_NAME,
    wfName: WORKFLOW_NAME,
    // DISPLAY label, not the short manifest kind. Codeless/Standard gets a
    // `type: logicapp`, `isCodeless: true` launch configuration below; codeful gets
    // `isCodeless: false`, mirroring CreateLogicAppVSCodeContents.getDebugConfiguration.
    appType: APP_TYPE_LABEL,
    wfType: 'Stateful',
  });
  await step(driver, 'form-filled');

  // SKILL.md rule 5: gate the Next click on validation success (the button turning
  // enabled), never on mere visibility.
  const nextButton = await waitForNextButton(driver);
  await clickReactElement(driver, nextButton, 'Next');
  await sleep(2000);
  await step(driver, 'review-page');

  log('Clicking "Create workspace" (3-attempt retry + on-disk verification)...');
  await clickCreateWorkspaceButton(driver, webview, { parentDir: WORKSPACE_PARENT_DIR, wsName: WORKSPACE_NAME });
  await step(driver, 'after-create-clicked');

  await waitForWorkspaceArtifacts();
  if (IS_CODEFUL) {
    // deepVerifyWorkspace is the shared verifier that already knows the codeful shape:
    // it requires `<wfName>.cs`, `<appName>.csproj`, `Program.cs`, host.json and
    // local.settings.json, and it FAILS if a codeless `workflow.json` was generated.
    // Asserting codeless artifacts for a codeful app would be wrong here.
    deepVerifyWorkspace(WORKSPACE_PARENT_DIR, {
      wsName: WORKSPACE_NAME,
      appName: APP_NAME,
      wfName: WORKFLOW_NAME,
      appType: 'codeful',
      wfType: 'Stateful',
    });
  } else {
    verifyWorkspaceOnDisk(WORKSPACE_PARENT_DIR, WORKSPACE_NAME, APP_NAME, { wfName: WORKFLOW_NAME });
  }
}

function configureGeneratedWorkspaceForAzuriteFailure(): void {
  const workspaceJson = readJson(WORKSPACE_FILE);
  workspaceJson.settings = {
    ...(workspaceJson.settings ?? {}),
    'azureLogicAppsStandard.autoStartAzurite': true,
    'azureLogicAppsStandard.autoStartDesignTime': true,
    'azureLogicAppsStandard.showProjectWarning': false,
    'azureLogicAppsStandard.verifyConnectionKeys': false,
    'azureFunctions.suppressProject': true,
    'debug.internalConsoleOptions': 'neverOpen',
  };
  writeJson(WORKSPACE_FILE, workspaceJson);

  const settingsPath = path.join(PROJECT_DIR, '.vscode', 'settings.json');
  const settingsJson = fs.existsSync(settingsPath) ? readJson(settingsPath) : {};
  writeJson(settingsPath, {
    ...settingsJson,
    'azureLogicAppsStandard.autoStartAzurite': true,
    'azureLogicAppsStandard.autoStartDesignTime': true,
    'azureLogicAppsStandard.showProjectWarning': false,
    'azureLogicAppsStandard.verifyConnectionKeys': false,
    'azureFunctions.suppressProject': true,
    'debug.internalConsoleOptions': 'neverOpen',
  });

  const launchPath = path.join(PROJECT_DIR, '.vscode', 'launch.json');
  // Diagnostics only: record what the wizard itself generated before we pin a
  // deterministic single-configuration launch.json. For codeful the two should agree
  // (CreateLogicAppVSCodeContents.getDebugConfiguration); a divergence here is the first
  // thing to read if the codeful variant ever starts behaving unlike a real F5.
  if (fs.existsSync(launchPath)) {
    try {
      log(`Wizard-generated launch.json: ${JSON.stringify(readJson(launchPath))}`);
    } catch (error) {
      log(`Could not read wizard-generated launch.json (${error})`);
    }
  }
  writeJson(launchPath, {
    version: '0.2.0',
    configurations: [buildLaunchConfiguration()],
  });

  const localSettingsJson = readJson(LOCAL_SETTINGS_FILE);
  localSettingsJson.Values = {
    ...(localSettingsJson.Values ?? {}),
    // The whole scenario hangs off this: activateAzurite only probes/starts the
    // emulator when AzureWebJobsStorage IS the local emulator connection string
    // (validatePreDebug.ts:214). Spreading the generated Values first preserves
    // WORKFLOW_CODEFUL_ENABLED, which is what routes F5 into the codeful branch.
    AzureWebJobsStorage: 'UseDevelopmentStorage=true',
    WORKFLOWS_SUBSCRIPTION_ID: '',
    WORKFLOWS_TENANT_ID: '',
    WORKFLOWS_RESOURCE_GROUP_NAME: '',
    WORKFLOWS_LOCATION_NAME: '',
  };
  writeJson(LOCAL_SETTINGS_FILE, localSettingsJson);
  assertAppKindMarker(localSettingsJson.Values ?? {});
  log(`Configured generated workspace for the Azurite failure scenario: ${WORKSPACE_FILE}`);
}

/**
 * Mirrors what the product itself writes, rather than inventing a shape:
 *   - codeful  → CreateLogicAppVSCodeContents.getDebugConfiguration(name, undefined, true)
 *                = { type: 'logicapp', request: 'launch', funcRuntime: 'coreclr', isCodeless: false }
 *                and, notably, NO preLaunchTask — the `func: host start` task is picked up
 *                by pickFuncProcessInternal via isFuncHostTask() when preLaunchTask is absent
 *                (pickFuncProcess.ts:124-128).
 *   - codeless → the historical `isCodeless: true` config this phase has always written.
 * Both are `type: 'logicapp'`, so both route F5 through debugLogicApp -> pickFuncProcessInternal,
 * whose FIRST statement is activateAzurite.
 */
function buildLaunchConfiguration(): Record<string, unknown> {
  return {
    name: `Run/Debug logic app ${APP_NAME}`,
    type: 'logicapp',
    request: 'launch',
    funcRuntime: 'coreclr',
    isCodeless: !IS_CODEFUL,
  };
}

/**
 * Guard against the whole codeful variant silently degrading into a second copy of the
 * codeless one. `pickFuncProcessInternal` chooses the publish branch purely from
 * `hasCodefulWorkflowSetting()`, i.e. `Values.WORKFLOW_CODEFUL_ENABLED === 'true'`
 * (utils/codeful.ts:35-48). If the wizard did not write it, a "passing" codeful run
 * would prove nothing about the codeful path.
 */
function assertAppKindMarker(values: Record<string, unknown>): void {
  const marker = values[WORKFLOW_CODEFUL_ENABLED_KEY];
  if (IS_CODEFUL && marker !== 'true') {
    throw new Error(
      `Codeful workspace must have ${WORKFLOW_CODEFUL_ENABLED_KEY}="true" in ${LOCAL_SETTINGS_FILE} (got ${JSON.stringify(marker)}). Without it pickFuncProcessInternal takes the codeless branch and the codeful variant tests nothing new.`
    );
  }
  if (!IS_CODEFUL && marker === 'true') {
    throw new Error(
      `Codeless workspace must NOT have ${WORKFLOW_CODEFUL_ENABLED_KEY}="true" in ${LOCAL_SETTINGS_FILE}; the wizard produced a codeful project.`
    );
  }
  log(`${WORKFLOW_CODEFUL_ENABLED_KEY}=${JSON.stringify(marker)} matches app kind "${APP_KIND}"`);
}

async function removeWorkspaceParent(): Promise<void> {
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      fs.rmSync(WORKSPACE_PARENT_DIR, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
      return;
    } catch (error) {
      if (attempt === 8) {
        throw error;
      }
      await sleep(3000);
    }
  }
}

describe(`Azurite auto-start failure E2E workspace creation (${APP_KIND})`, function () {
  this.timeout(TEST_TIMEOUT);

  let workbench: Workbench;
  let driver: WebDriver;

  before(async function () {
    if (!IS_CREATE_STEP) {
      return;
    }
    this.timeout(EXTENSION_READY_TIMEOUT + DEPENDENCY_SETTLE_TIMEOUT + 120_000);
    fs.mkdirSync(EXPLICIT_SCREENSHOT_DIR, { recursive: true });
    workbench = new Workbench();
    driver = workbench.getDriver();
    log(`Screenshots: ${EXPLICIT_SCREENSHOT_DIR}`);

    // ---------------------------------------------------------------------
    // Warm-up gate. The original revision had NONE of this and went straight
    // into the command palette at t≈0, which is why the whole phase failed in
    // 9 seconds. Phase 4.13A runs writeTestSettings({ validateDependencies:
    // true }) (run-e2e.ts:2138) and is the first session of `azuriteonly`, so
    // on a cold runner the extension is still downloading the .NET SDK,
    // Functions Core Tools, NodeJS and the workflows bundle for the first
    // minute or two.
    // ---------------------------------------------------------------------

    // Stage 1 (hard gate): the palette command must exist before anything else
    // can work. Until activation registers it, the pick loop matches nothing and
    // the fallback search races a quick-input widget VS Code is tearing down.
    log('Stage 1/3: waiting for the Logic Apps extension to register its commands...');
    await waitForExtensionReady(workbench, EXTENSION_READY_TIMEOUT);
    log('Stage 1/3: extension commands are registered');
    await step(driver, 'extension-ready');

    // Stage 2 (best-effort): let the runtime-dependency download settle. This
    // polls the exact "Validating Runtime Dependency" notification/status-bar
    // text the failure screenshots showed, until it has been quiet for 10s,
    // dismissing GitHub 403 toasts and fixing exec bits along the way.
    //
    // Deliberately NON-FATAL. waitForExtensionValidationComplete throws on
    // timeout and via assertFuncCoreToolsExecutable, and its phase 3 waits on
    // the design-time API — which cannot start here because 4.13A has no
    // workspace open yet. Creating a workspace is mostly file scaffolding and
    // does not need func on disk, so a slow or unhappy dependency validation
    // must not turn this phase red on its own. If creation then fails, the
    // step screenshots below say why.
    log('Stage 2/3: waiting for runtime-dependency validation to go quiet (best-effort)...');
    try {
      await waitForExtensionValidationComplete(driver, DEPENDENCY_SETTLE_TIMEOUT);
      log('Stage 2/3: dependency validation settled');
    } catch (error) {
      log(`Stage 2/3: dependency validation did not settle cleanly (continuing anyway): ${error}`);
    }
    await step(driver, 'dependencies-settled');

    // Stage 3: clear the toasts the screenshots showed sitting over the
    // workbench (the bundle-download progress notification and C# Dev Kit's
    // "Sign in to use your Visual Studio subscription benefits"). These both
    // steal focus from the quick input and intercept webview iframe clicks.
    log('Stage 3/3: clearing blocking notifications/dialogs...');
    await clearBlockingUI(driver);
    log('Warm-up complete');
  });

  afterEach(async function () {
    if (!IS_CREATE_STEP || this.currentTest?.state !== 'failed') {
      return;
    }
    this.timeout(60_000);
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
    const failName = (this.currentTest.title || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 80);
    await captureScreenshot(driver, `FAIL-${failName}`, EXPLICIT_SCREENSHOT_DIR);
    log(`Workspace parent contents at failure: ${describeDirectory(WORKSPACE_PARENT_DIR)}`);
  });

  after(async function () {
    if (!IS_CREATE_STEP) {
      return;
    }
    this.timeout(30_000);
    try {
      await driver.switchTo().defaultContent();
    } catch {
      /* ignore */
    }
  });

  if (IS_CREATE_STEP) {
    it(`creates a ${APP_KIND} Logic Apps workspace through the Create Workspace webview`, async function () {
      this.timeout(TEST_TIMEOUT);
      await createWorkspaceFromWebview(workbench, driver);
      configureGeneratedWorkspaceForAzuriteFailure();
    });
  } else {
    it('is intentionally create-phase only', function () {
      console.log(
        `${LOG_PREFIX} Skipping AZURITE_E2E_STEP=${E2E_STEP}. Debug assertion coverage lives in azuriteAutostartFailureAssert.test.ts.`
      );
      this.skip();
    });
  }
});
