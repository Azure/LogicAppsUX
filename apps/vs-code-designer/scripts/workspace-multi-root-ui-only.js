/* global __dirname, __filename, console, module, process, require, setTimeout, clearTimeout */
// Local supplementary diagnostic in the CLI family model, NOT a registered
// acceptance lane. The protected full runner and its inventory remain intact.
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const runner = require('./run-e2e-cli');
const family = require('./workspace-multi-root');
const root = path.resolve(__dirname, '..');

function assertUiOnlyEnvironment(env, platform = process.platform) {
  assert.equal(platform, 'win32', 'This local UI diagnostic requires native Windows');
  for (const name of Object.keys(env)) {
    assert.ok(
      !env[name] ||
        !/^(BUILD_|SYSTEM_|TF_BUILD$|LA_E2E_CLI_AZURE_|WORKFLOWS_|LA_E2E_CLI_MULTI_ROOT_ISOLATED$|LA_E2E_CLI_MULTI_ROOT_DIAGNOSTIC_ONLY$|LA_E2E_CLI_SUITE_|LA_E2E_CLI_EVIDENCE_)/i.test(
          name
        ),
      `UI-only diagnostic refuses inherited acceptance/ADO/Azure context: ${name}`
    );
  }
  assert.ok(env.LA_E2E_CLI_EXTENSIONS_DIR, 'Verified prepared extensions are required');
}

function uiOnlyVerdict(observation, closures) {
  return {
    uiOnly: true,
    fullSuiteAccepted: false,
    populationObserved: false,
    debugObserved: false,
    uiPassed: observation?.uiPassed === true,
    originalProcessClosureVerified:
      closures.length >= 2 && closures.every((closure) => closure?.verified === true && closure.forcedTerminationAttempted !== true),
    forcedRecovery: closures.some((closure) => closure?.forcedTerminationAttempted === true),
  };
}

function removeOwnedRoot(ownedRoot, marker, closure) {
  assert.ok(
    closure?.verified === true && closure.forcedTerminationAttempted !== true,
    'Natural original closure is required before deleting diagnostic roots'
  );
  assert.match(ownedRoot, /^D:\\la9f5298-ui-[a-zA-Z0-9-]+$/);
  assert.ok(!fs.lstatSync(ownedRoot).isSymbolicLink(), 'Diagnostic root cannot be a link');
  assert.equal(fs.readFileSync(path.join(ownedRoot, '.ui-only-owner'), 'utf8'), marker, 'Diagnostic root ownership changed');
  fs.rmSync(ownedRoot, { recursive: true });
}

async function worker(artifactRoot, ownedRoot, marker, captureOnly = false) {
  assert.equal(process.env.LA_E2E_CLI_UI_ONLY_WORKER_MARKER, marker, 'Worker must come from the owned diagnostic launcher');
  assert.equal(fs.readFileSync(path.join(ownedRoot, '.ui-only-owner'), 'utf8'), marker, 'Worker ownership changed');
  const deadline = Date.now() + 8 * 60 * 1000;
  // The outer Job owns this worker and all Code descendants. A deadline exits
  // the worker, allowing ONLY that Job to recover; no machine process scan.
  const watchdog = setTimeout(() => {
    fs.writeFileSync(path.join(artifactRoot, 'worker-timeout.json'), JSON.stringify({ uiOnly: true, fullSuiteAccepted: false, deadline }));
    process.exit(1);
  }, deadline - Date.now());
  const closures = [];
  let observation;
  try {
    const workspaceParent = path.join(ownedRoot, 'w');
    fs.mkdirSync(workspaceParent);
    const context = {
      invocation: marker,
      identity: {
        source: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        run: 'local-ui-only',
        job: marker,
        platform: 'win32',
      },
      startedUtc: new Date().toISOString(),
      workspaceParent: fs.realpathSync(workspaceParent),
      extensionsDir: fs.realpathSync(process.env.LA_E2E_CLI_EXTENSIONS_DIR),
      requestedVersion: 'stable',
    };
    fs.writeFileSync(
      path.join(artifactRoot, 'invocation.json'),
      JSON.stringify({ ...context, uiOnly: true, fullSuiteAccepted: false }, null, 2)
    );
    const handoffPath = path.join(artifactRoot, 'wizard-handoff.json');
    // Actual supported Create Workspace helper, with its original native
    // lifecycle/closure diagnostics. No synthetic folders or manifest.
    const code = await runner._test.runVscodeTest(['--label', 'createWorkspaceCoreMatrix'], {
      workspaceParent,
      retainWorkspaceForSupplement: true,
      extraEnv: {
        LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful',
        LA_E2E_CLI_PRESERVE_WORKSPACES: '1',
        LA_E2E_CLI_MULTI_ROOT_HANDOFF: handoffPath,
        LA_E2E_CLI_MULTI_ROOT_CONTEXT: JSON.stringify(context),
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: path.join(artifactRoot, 'setup-phases.jsonl'),
        LA_E2E_CLI_PROFILE_PHASE: 'ui-only-setup',
        LA_E2E_CLI_USER_DATA_DIR: path.join(ownedRoot, 'p1'),
      },
    });
    assert.equal(code, 0, 'Original Create Workspace helper failed; no regular-window retry');
    const { entry, launch } = family.validateHandoff(JSON.parse(fs.readFileSync(handoffPath, 'utf8')), context);
    assert.equal(launch.version, '1.144.0', 'UI probe must use the prepared Code version');
    const profile = path.join(ownedRoot, 'p2');
    fs.mkdirSync(path.join(profile, 'User'), { recursive: true });
    fs.writeFileSync(
      path.join(profile, 'User/settings.json'),
      JSON.stringify({
        'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': false,
        'azureLogicAppsStandard.autoRuntimeDependenciesPath': process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT,
        'azureLogicAppsStandard.funcCoreToolsBinaryPath': 'func',
        'azureLogicAppsStandard.autoStartDesignTime': false,
        'azureLogicAppsStandard.autoStartAzurite': false,
        'azureLogicAppsStandard.parameterizeConnectionsInProjectLoad': false,
        'azureLogicAppsStandard.silentAuth': true,
        'extensions.autoUpdate': false,
        'extensions.autoCheckUpdates': false,
        'update.mode': 'none',
        'telemetry.telemetryLevel': 'off',
      })
    );
    const { controlledFuncEnvironment } = require('../out/test/e2e/workspaceMultiRootLaunch');
    const regular = runner._test.spawnContainedProcess(
      launch.executable,
      [
        `--user-data-dir=${profile}`,
        `--extensions-dir=${launch.extensionsDir}`,
        `--extensionDevelopmentPath=${path.join(root, 'dist')}`,
        `--extensionDevelopmentPath=${path.join(__dirname, 'fixtures/workspace-multi-root-recorder')}`,
        '--disable-workspace-trust',
        '--disable-updates',
        '--disable-restore-windows',
        '--disable-gpu',
        '--skip-welcome',
        '--skip-release-notes',
        '--locale=en-US',
        '--new-window',
        '--window-size=1920,1080',
        '--remote-debugging-port=0',
        '--remote-debugging-address=127.0.0.1',
        entry.wsFilePath,
      ],
      {
        cwd: root,
        env: {
          ...controlledFuncEnvironment(path.join(process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT, 'FuncCoreTools'), process.env),
          LA_E2E_CLI_USER_DATA_DIR: profile,
          LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
          LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '0',
          LA_E2E_CLI_MULTI_ROOT_EVENTS: path.join(artifactRoot, 'activation-events.jsonl'),
        },
      }
    );
    const closed = new Promise((resolve, reject) => {
      regular.child.once('error', reject);
      regular.child.once('close', (code, signal) => resolve(regular.readClosure(code, signal)));
    });
    closed.catch(() => {});
    // Store only sanitized stdout, never profiles, auth stores or environment.
    for (const stream of [regular.child.stdout, regular.child.stderr]) {
      stream.on('data', (data) =>
        fs.appendFileSync(path.join(artifactRoot, 'regular-code.log'), runner.redactDiagnosticText(data.toString()))
      );
    }
    const { waitForDevToolsActivePort } = require('../out/test/e2e/cdpClient');
    process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = String(await waitForDevToolsActivePort(profile, Math.min(deadline, Date.now() + 60000)));
    process.env.LA_E2E_CLI_SCREENSHOT_DIR = path.join(artifactRoot, 'screenshots');
    observation = await require('../out/test/e2e/workspaceMultiRootUiDiagnostic').runWorkspaceMultiRootUiDiagnostic(
      entry,
      artifactRoot,
      deadline,
      path.join(artifactRoot, 'activation-events.jsonl'),
      captureOnly
    );
    closures.push(await closed);
    runner._test.collectVscodeProfileLogs('ui-only-regular', {
      ...process.env,
      LA_E2E_CLI_USER_DATA_DIR: profile,
      LA_E2E_CLI_PROFILE_PHASE: captureOnly ? 'activation-capture-only' : 'ui-only-regular',
    });
    // The helper already gates setup on its own original Job closure. Retain
    // that actual receipt rather than inventing a success boolean.
    const receiptDir = path.join(artifactRoot, 'process-closure', 'launches');
    for (const file of fs.readdirSync(receiptDir).filter((file) => file.endsWith('.json'))) {
      const receipt = JSON.parse(fs.readFileSync(path.join(receiptDir, file), 'utf8'));
      if (!closures.some((closure) => closure.rootPid === receipt.rootPid)) closures.push(receipt);
    }
  } catch (error) {
    fs.writeFileSync(
      path.join(artifactRoot, 'original-error.json'),
      JSON.stringify({ uiOnly: true, fullSuiteAccepted: false, error: runner.redactDiagnosticText(String(error)) }, null, 2)
    );
  } finally {
    fs.writeFileSync(
      path.join(artifactRoot, 'worker-result.json'),
      JSON.stringify({ ...uiOnlyVerdict(observation, closures), captureOnly, observation, closures }, null, 2)
    );
    clearTimeout(watchdog);
  }
  return observation?.uiPassed === true && closures.length >= 2 && closures.every((closure) => closure.verified === true) ? 0 : 1;
}

async function main() {
  assertUiOnlyEnvironment(process.env);
  assert.equal(process.argv[2], '--artifacts', 'Required: --artifacts <fresh sanitized diagnostic directory>');
  assert.ok(
    process.argv.length === 4 || (process.argv.length === 5 && process.argv[4] === '--activation-capture-only'),
    'Unknown diagnostic mode'
  );
  const captureOnly = process.argv[4] === '--activation-capture-only';
  const artifactRoot = path.resolve(process.argv[3]);
  assert.ok(!fs.existsSync(artifactRoot), 'Preserve earlier diagnostics; artifact directory must be fresh');
  fs.mkdirSync(artifactRoot, { recursive: true });
  const prepared = require('./prepare-e2e-extension-dependencies');
  let seed;
  try {
    seed = prepared.verify({
      ...prepared.parseArguments(['verify', '--extensions-dir', process.env.LA_E2E_CLI_EXTENSIONS_DIR, '--vscode-version', 'stable']),
      rebuildRegistry: false,
    });
  } catch (error) {
    fs.writeFileSync(
      path.join(artifactRoot, 'admission-failure.json'),
      JSON.stringify(
        {
          uiOnly: true,
          fullSuiteAccepted: false,
          nativeStarted: false,
          error: runner.redactDiagnosticText(String(error)),
        },
        null,
        2
      ),
      { flag: 'wx' }
    );
    throw error;
  }
  fs.writeFileSync(
    path.join(artifactRoot, 'seed-verification.json'),
    JSON.stringify(
      {
        uiOnly: true,
        fullSuiteAccepted: false,
        contentDigestSHA256: seed.contentDigestSHA256,
        extensions: seed.extensions.map(({ id, version, contentSHA256 }) => ({ id, version, contentSHA256 })),
      },
      null,
      2
    )
  );
  const ownedRoot = fs.mkdtempSync('D:\\la9f5298-ui-');
  const marker = randomUUID();
  fs.writeFileSync(path.join(ownedRoot, '.ui-only-owner'), marker, { flag: 'wx' });
  const env = {
    ...process.env,
    LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT: artifactRoot,
    LA_E2E_CLI_USER_DATA_PARENT: ownedRoot,
    LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: path.join(ownedRoot, 'r'),
    LA_E2E_CLI_VSCODE_LOG_DIR: path.join(artifactRoot, 'setup-logs'),
    LA_E2E_CLI_SCREENSHOT_DIR: path.join(artifactRoot, 'screenshots'),
    LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: path.join(artifactRoot, 'setup-workspaces'),
    LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL: '1',
    LA_E2E_CLI_VSCODE_VERSION: 'stable',
    LA_E2E_CLI_UI_ONLY_WORKER_MARKER: marker,
    // C# writes derived caches into its extension directory even with updates
    // disabled. Consume an owned copy; never launch against the producer seed.
    LA_E2E_CLI_EXTENSIONS_DIR: path.join(ownedRoot, 'e'),
    // Keep all temporary C#/Dev Kit state under the owned short root, too.
    TEMP: ownedRoot,
    TMP: ownedRoot,
  };
  fs.cpSync(process.env.LA_E2E_CLI_EXTENSIONS_DIR, env.LA_E2E_CLI_EXTENSIONS_DIR, { recursive: true, dereference: false });
  // Read/copy only known runtime binaries from the existing cache. UI-only
  // does not bootstrap/install dependencies or assert runtime health.
  fs.mkdirSync(env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT);
  fs.cpSync(
    path.join(process.env.USERPROFILE, '.azurelogicapps', 'dependencies', 'FuncCoreTools'),
    path.join(env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT, 'FuncCoreTools'),
    { recursive: true, dereference: false }
  );
  const extension = path.join(root, 'dist/main.js');
  fs.writeFileSync(
    path.join(artifactRoot, 'product-binding.json'),
    JSON.stringify(
      {
        extensionSHA256: createHash('sha256').update(fs.readFileSync(extension)).digest('hex'),
        uiOnly: true,
        fullSuiteAccepted: false,
        ownedRoot,
        limitations: ['Design-time and Azurite auto-start disabled: UI-stage only, no runtime/population/debug proof'],
      },
      null,
      2
    )
  );
  process.env.LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT = artifactRoot;
  const launch = runner._test.spawnContainedProcess(
    process.execPath,
    [__filename, '--worker', artifactRoot, ownedRoot, marker, ...(captureOnly ? ['--activation-capture-only'] : [])],
    {
      cwd: root,
      env,
    }
  );
  launch.child.stdout.on('data', (data) => process.stdout.write(data));
  launch.child.stderr.on('data', (data) => process.stderr.write(data));
  const closure = await new Promise((resolve, reject) => {
    launch.child.once('error', reject);
    launch.child.once('close', (code, signal) => resolve(launch.readClosure(code, signal)));
  });
  fs.writeFileSync(path.join(artifactRoot, 'outer-closure.json'), JSON.stringify(closure, null, 2));
  const result = fs.existsSync(path.join(artifactRoot, 'worker-result.json'))
    ? JSON.parse(fs.readFileSync(path.join(artifactRoot, 'worker-result.json'), 'utf8'))
    : {};
  const verdict = uiOnlyVerdict(result.observation, [...(result.closures || []), closure]);
  verdict.originalProcessClosureVerified &&= (result.closures || []).length >= 2;
  let rootsRemoved = false;
  if (verdict.originalProcessClosureVerified) {
    removeOwnedRoot(ownedRoot, marker, closure);
    rootsRemoved = true;
  }
  fs.writeFileSync(
    path.join(artifactRoot, 'diagnostic-result.json'),
    JSON.stringify({ ...verdict, captureOnly, rootsRemoved, ownedRoot }, null, 2)
  );
  console.log(`[workspaceMultiRoot UI-ONLY / NOT FULL-SUITE ACCEPTANCE] ${JSON.stringify(verdict)}; artifacts=${artifactRoot}`);
  return verdict.uiPassed && verdict.originalProcessClosureVerified ? 0 : 1;
}

module.exports = { assertUiOnlyEnvironment, uiOnlyVerdict, removeOwnedRoot };
if (require.main === module) {
  (process.argv[2] === '--worker'
    ? worker(process.argv[3], process.argv[4], process.argv[5], process.argv[6] === '--activation-capture-only')
    : main()
  )
    .then((code) => {
      if (process.argv[2] === '--worker') process.exit(code);
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(runner.redactDiagnosticText(String(error)));
      if (process.argv[2] === '--worker') process.exit(1);
      process.exitCode = 1;
    });
}
