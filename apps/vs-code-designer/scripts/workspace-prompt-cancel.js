/* global __dirname, console, module, process, require, setTimeout, clearTimeout */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const extensionRoot = path.resolve(__dirname, '..');
const requiredScreenshots = [
  'workspace-prompt-cancel-ui-open-folder.png',
  'workspace-prompt-cancel-ui-before.png',
  'workspace-prompt-cancel-ui-after.png',
  'workspace-prompt-cancel-ui-preceding-no.png',
];
const hashFile = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const required = (env) => /^(1|true)$/i.test(env.LA_E2E_CLI_REQUIRE_WORKSPACE_CANCEL || '');
const diagnosticRoot = (env) =>
  path.resolve(env.LA_E2E_CLI_CANCEL_DIAGNOSTICS_DIR || path.join(extensionRoot, '.vscode-test', 'workspace-cancel'));
const cancelPlatformLaunchArgs = (platform) => (platform === 'linux' ? ['--password-store=gnome-libsecret'] : []);

function prepareCancelContext(env, workspaceParent) {
  assert.ok(workspaceParent && fs.statSync(workspaceParent).isDirectory(), 'Current runner-created wizard root is required');
  const root = diagnosticRoot(env);
  fs.mkdirSync(root, { recursive: true });
  const context = {
    schemaVersion: 1,
    invocation: randomUUID(),
    identity: {
      source: env.BUILD_SOURCEVERSION || 'local',
      run: env.BUILD_BUILDID || 'local',
      job: env.SYSTEM_JOBID || 'local',
      platform: process.platform,
    },
    startedUtc: new Date().toISOString(),
    workspaceParent: fs.realpathSync(workspaceParent),
    requestedVersion: env.LA_E2E_CLI_VSCODE_VERSION || 'stable',
    extensionsDir: env.LA_E2E_CLI_EXTENSIONS_DIR,
    root,
    handoffPath: path.join(root, 'wizard-handoff.json'),
    resultPath: path.join(root, 'final-result.json'),
  };
  for (const file of [context.handoffPath, context.resultPath, path.join(root, 'invocation.json')]) {
    assert.ok(!fs.existsSync(file), 'Cancel diagnostic paths must be fresh for this job; stale evidence is rejected');
  }
  fs.writeFileSync(path.join(root, 'invocation.json'), `${JSON.stringify(context)}\n`, { flag: 'wx' });
  return context;
}

function assertInside(root, candidate) {
  assert.ok(typeof candidate === 'string' && path.isAbsolute(candidate), 'Wizard paths must be absolute');
  const relative = path.relative(root, candidate);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Wizard path is outside its current original root');
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Wizard handoff must not traverse links');
  }
}

function adaptCancelHandoff(handoff, context) {
  assert.equal(handoff.schemaVersion, 1);
  assert.equal(handoff.invocation, context.invocation, 'Stale or wrong wizard invocation');
  assert.deepEqual(handoff.identity, context.identity, 'Wrong job/source/platform handoff');
  assert.ok(Array.isArray(handoff.entries), 'Wizard must emit verified manifest entries');
  const matches = handoff.entries.filter((entry) => entry.appType === 'standard' && entry.wfType === 'Stateful');
  assert.equal(matches.length, 1, 'Exactly one verified Standard Stateful app is required; missing/ambiguous handoff rejected');
  const entry = matches[0];
  assert.equal(entry.parentDir, context.workspaceParent, 'Wrong original wizard root');
  assert.ok(
    Date.parse(entry.createdAt) >= Date.parse(context.startedUtc) && Date.parse(entry.createdAt) <= Date.now(),
    'Stale creation timestamp'
  );
  const workspace = {
    appDir: entry.appDir,
    workspaceFilePath: entry.wsFilePath,
    workflowJsonPath: path.join(entry.wfDir, 'workflow.json'),
  };
  assert.equal(path.dirname(entry.appDir), entry.wsDir);
  assert.equal(path.dirname(entry.wsFilePath), entry.wsDir);
  assert.equal(path.dirname(entry.wfDir), entry.appDir);
  for (const candidate of [entry.wsDir, ...Object.values(workspace)]) {
    assertInside(context.workspaceParent, candidate);
  }
  assert.equal(JSON.parse(fs.readFileSync(workspace.workflowJsonPath, 'utf8')).kind, 'Stateful');
  const folders = JSON.parse(fs.readFileSync(workspace.workspaceFilePath, 'utf8')).folders;
  assert.ok(
    folders.some((folder) => path.resolve(entry.wsDir, folder.path) === path.resolve(entry.appDir)),
    'Workspace does not contain this same app'
  );
  const launch = handoff.launch;
  assert.ok(launch && path.isAbsolute(launch.executable), 'Original creation host must supply the resolved Code executable');
  assert.equal(fs.realpathSync(launch.executable), launch.executable, 'Code executable must be its original physical path');
  assert.equal(hashFile(launch.executable), launch.sha256, 'Cached Code bytes changed after the creating host');
  if (context.requestedVersion !== 'stable') {
    assert.equal(launch.version, context.requestedVersion, 'Creation host Code version differs from admitted version');
  }
  assert.equal(fs.realpathSync(launch.extensionsDir), fs.realpathSync(context.extensionsDir), 'Prepared extensions directory changed');
  return { workspace, launch };
}

function resolveCancelProfile(env, platform = process.platform, runKey = randomUUID()) {
  const profile = env.LA_E2E_CLI_CANCEL_USER_DATA_DIR
    ? path.resolve(env.LA_E2E_CLI_CANCEL_USER_DATA_DIR)
    : path.join(env.LA_E2E_CLI_USER_DATA_PARENT || os.tmpdir(), `uc-${runKey.slice(0, 8)}`);
  const actualSocket = path.join(profile, 'main.sock');
  if (platform === 'linux') {
    assert.ok(Buffer.byteLength(actualSocket, 'utf8') < 100, 'Actual Cancel profile socket path exceeds the Linux byte budget');
  }
  assert.ok(!fs.existsSync(profile), 'Cancel must use a fresh regular profile, not the creation-host profile');
  return profile;
}

function assertRequiredScreenshots(root) {
  return requiredScreenshots.map((name) => {
    const file = path.join(root, 'screenshots', name);
    const bytes = fs.readFileSync(file);
    assert.ok(
      bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'Required real screenshot is missing/invalid'
    );
    const sidecarName = name.replace(/\.png$/, '.json');
    const sidecarFile = path.join(root, 'screenshots', sidecarName);
    const readiness = JSON.parse(fs.readFileSync(sidecarFile, 'utf8'));
    assert.equal(readiness.schemaVersion, 1);
    assert.equal(readiness.checkpoint, name.slice(0, -4), 'Required screenshot/readiness checkpoint mismatch');
    assert.equal(readiness.classification, 'evidence');
    assert.equal(readiness.verdict, 'accepted', 'Required screenshot capture/readiness did not succeed');
    assert.equal(readiness.target?.owner, 'workbench');
    assert.ok(readiness.target?.opaqueTargetId && readiness.target?.opaqueFrameId);
    assert.ok(Number.isInteger(readiness.target?.generation));
    assert.ok(readiness.timing?.samples > 1 && readiness.timing?.captureAttempts > 0);
    assert.ok(readiness.geometry?.viewport?.width > 0 && readiness.geometry?.viewport?.height > 0);
    const accepted = readiness.events?.findLast((event) => event.name === 'accepted');
    assert.ok(
      accepted && accepted.attempt === readiness.timing.captureAttempts && accepted.generation === readiness.target.generation,
      'Required screenshot lacks matching successful capture/readiness events'
    );
    return { name, sha256: hashFile(file), sidecar: sidecarName, sidecarSha256: hashFile(sidecarFile) };
  });
}

function assertCancelResult(result, root, identity) {
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.scenario, 'workspace-prompt-cancel');
  assert.equal(result.invocationCount, 1, 'Supplementary UI invocation must occur exactly once');
  assert.equal(result.complete, true, 'Cancel supplementary result is missing or failed');
  assert.equal(result.observation?.realCancelMouseInput, true);
  assert.equal(result.observation?.realPrecedingNoMouseInput, true);
  assert.equal(result.observation?.noReload, true);
  assert.ok(result.observation?.samples > 1);
  const files = result.observation.before?.files;
  assert.ok(Array.isArray(files) && files.length === 8, 'All eight original wizard-file hashes are required');
  assert.equal(new Set(files.map((file) => file.name)).size, 8);
  assert.ok(
    files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)),
    'Original file SHA-256 hashes are required'
  );
  assert.deepEqual(result.observation.initialFiles, files, 'No/Open Folder must not weaken or change the initial eight wizard hashes');
  for (const entries of [result.observation.initialDirectories, result.observation.postNoDirectories, result.observation.before.entries]) {
    assert.deepEqual(Object.keys(entries).sort(), ['app', 'vscode', 'workspace']);
    assert.ok(Object.values(entries).every(Array.isArray), 'All three directory-entry lists must be retained');
  }
  assert.deepEqual(result.observation.before, result.observation.after);
  assert.deepEqual(result.originalCodeClose, { code: 0, signal: null }, 'Original Code must close normally');
  assert.equal(result.errors.length, 0);
  assert.equal(result.cleanup?.verified, true, 'Existing final wizard cleanup must complete');
  if (identity) {
    assert.deepEqual(result.identity, identity, 'Supplementary evidence must belong to the current job/source');
  }
  assert.deepEqual(result.screenshots, assertRequiredScreenshots(root));
  assert.ok(fs.statSync(path.join(root, 'code.log')).size > 0);
  assert.ok(fs.statSync(path.join(root, 'vscode-logs')).isDirectory(), 'Actual regular Code profile logs are required');
}

function finalizeCancelResult(context, result, cleanup, errors = []) {
  result.cleanup = { verified: cleanup?.verified === true, action: cleanup?.action, reason: cleanup?.reason };
  result.errors.push(...errors.map((error) => String(error)));
  result.complete =
    result.observationPassed === true &&
    result.errors.length === 0 &&
    result.originalCodeClose?.code === 0 &&
    result.originalCodeClose?.signal === null &&
    cleanup?.verified === true;
  result.finalizedUtc = new Date().toISOString();
  fs.appendFileSync(
    path.join(context.root, 'cancel.log'),
    `${JSON.stringify({
      observationPassed: result.observationPassed,
      originalCodeClose: result.originalCodeClose,
      cleanupVerified: result.cleanup.verified,
      errors: result.errors,
    })}\n`
  );
  let evidenceError;
  if (result.complete) {
    try {
      assertCancelResult(result, context.root, context.identity);
    } catch (error) {
      evidenceError = error;
      result.errors.push(String(error));
      result.complete = false;
    }
  }
  fs.writeFileSync(context.resultPath, `${JSON.stringify(result, null, 2)}\n`);
  if (evidenceError) {
    throw evidenceError;
  }
  return result;
}

async function runCancelSupplement(context, env, collectProfileLogs) {
  const result = {
    schemaVersion: 1,
    scenario: 'workspace-prompt-cancel',
    invocation: context.invocation,
    identity: context.identity,
    invocationCount: 0,
    complete: false,
    observationPassed: false,
    originalCodeClose: null,
    errors: [],
  };
  let completion;
  let profile;
  let ui;
  const originalScreenshotDir = process.env.LA_E2E_CLI_SCREENSHOT_DIR;
  const originalDebugPort = process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
  const log = fs.createWriteStream(path.join(context.root, 'code.log'), { flags: 'wx' });
  log.on('error', (error) => {
    result.errors.push(String(error));
    console.error(`[workspace-cancel] Code diagnostic log failed: ${String(error)}`);
  });
  try {
    const marker = path.join(context.root, 'started.json');
    fs.writeFileSync(marker, `${JSON.stringify({ invocation: context.invocation })}\n`, { flag: 'wx' });
    result.invocationCount = 1;
    const handoff = adaptCancelHandoff(JSON.parse(fs.readFileSync(context.handoffPath, 'utf8')), context);
    result.code = { version: handoff.launch.version, sha256: handoff.launch.sha256 };
    profile = resolveCancelProfile(env, process.platform, context.invocation);
    const screenshotDir = path.join(context.root, 'screenshots');
    process.env.LA_E2E_CLI_SCREENSHOT_DIR = screenshotDir;
    process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT || '9513';
    ui = require('../out/test/e2e/workspacePromptCancel');
    const baseline = ui.captureWorkspacePromptCancelBaseline(context.workspaceParent, handoff.workspace);
    fs.mkdirSync(path.join(profile, 'User'), { recursive: true });
    fs.writeFileSync(
      path.join(profile, 'User', 'settings.json'),
      JSON.stringify({
        'files.simpleDialog.enable': true,
        'telemetry.telemetryLevel': 'off',
        'update.mode': 'none',
        'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': false,
        'azureLogicAppsStandard.autoStartDesignTime': false,
        'azureLogicAppsStandard.parameterizeConnectionsInProjectLoad': false,
      })
    );
    const args = [
      ...cancelPlatformLaunchArgs(process.platform),
      `--user-data-dir=${profile}`,
      `--extensions-dir=${handoff.launch.extensionsDir}`,
      `--extensionDevelopmentPath=${path.join(extensionRoot, 'dist')}`,
      '--disable-workspace-trust',
      '--disable-updates',
      '--disable-restore-windows',
      '--disable-gpu',
      '--enable-smoke-test-driver',
      '--skip-welcome',
      '--skip-release-notes',
      '--locale=en-US',
      '--new-window',
      '--window-size=1920,1080',
      `--remote-debugging-port=${process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT}`,
      '--remote-debugging-address=127.0.0.1',
    ];
    assert.ok(fs.existsSync(path.join(extensionRoot, 'dist', 'main.js')), 'Admitted compiled extension is required');
    const child = spawn(handoff.launch.executable, args, {
      env: {
        ...env,
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '0',
        VSCODE_RUNNING_TESTS: '1',
        DEBUGTELEMETRY: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    completion = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => {
        result.originalCodeClose = { code, signal };
        resolve({ code, signal });
      });
    });
    completion.catch((error) => console.error(`[workspace-cancel] Original Code launch failed: ${String(error)}`));
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (data) => log.write(data));
    }
    result.observation = await Promise.race([
      ui.runWorkspacePromptCancelUi(context.workspaceParent, handoff.workspace, baseline),
      completion.then(() => {
        throw new Error('Original Code closed before the supplementary UI observation finished');
      }),
    ]);
    result.screenshots = assertRequiredScreenshots(context.root);
    result.observationPassed = true;
  } catch (error) {
    result.errors.push(String(error));
    console.error(`[workspace-cancel] Original observation/preflight failure: ${String(error)}`);
  } finally {
    if (completion && !result.originalCodeClose) {
      try {
        await ui.closeWorkspacePromptCancelWindow(!result.observationPassed);
        let timer;
        try {
          await Promise.race([
            completion,
            new Promise((_resolve, reject) => {
              timer = setTimeout(() => reject(new Error('Code did not finish after ordinary Close Window; no forced cleanup')), 10000);
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      } catch (error) {
        result.errors.push(String(error));
        console.error(`[workspace-cancel] Original teardown failure: ${String(error)}`);
      }
    }
    if (profile) {
      try {
        collectProfileLogs('workspaceCancel', {
          ...env,
          LA_E2E_CLI_USER_DATA_DIR: profile,
          LA_E2E_CLI_PROFILE_PHASE: 'workspace-cancel',
          LA_E2E_CLI_VSCODE_LOG_ARTIFACT_LABEL: 'workspaceCancel',
          LA_E2E_CLI_VSCODE_LOG_DIR: path.join(context.root, 'vscode-logs'),
        });
      } catch (error) {
        result.errors.push(String(error));
        console.error(`[workspace-cancel] Required profile diagnostics failed: ${String(error)}`);
      }
    }
    try {
      await new Promise((resolve, reject) => {
        log.once('error', reject);
        log.end(resolve);
      });
    } catch (error) {
      result.errors.push(String(error));
    }
    if (originalScreenshotDir === undefined) {
      delete process.env.LA_E2E_CLI_SCREENSHOT_DIR;
    } else {
      process.env.LA_E2E_CLI_SCREENSHOT_DIR = originalScreenshotDir;
    }
    if (originalDebugPort === undefined) {
      delete process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
    } else {
      process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = originalDebugPort;
    }
    // This pending result is overwritten only after the existing runner's final diagnostics/cleanup.
    finalizeCancelResult(context, result, { verified: false, pending: true });
  }
  return result;
}

if (require.main === module) {
  const root = process.argv[2];
  const identity = {
    source: process.env.BUILD_SOURCEVERSION || 'local',
    run: process.env.BUILD_BUILDID || 'local',
    job: process.env.SYSTEM_JOBID || 'local',
    platform: process.argv[3] === 'windows' ? 'win32' : process.argv[3] || process.platform,
  };
  assertCancelResult(JSON.parse(fs.readFileSync(path.join(root, 'final-result.json'), 'utf8')), root, identity);
  console.log('[workspace-cancel] Required supplementary result accepted; canonical Mocha counts unchanged.');
}
module.exports = {
  required,
  diagnosticRoot,
  prepareCancelContext,
  adaptCancelHandoff,
  resolveCancelProfile,
  assertRequiredScreenshots,
  assertCancelResult,
  finalizeCancelResult,
  runCancelSupplement,
  cancelPlatformLaunchArgs,
};
