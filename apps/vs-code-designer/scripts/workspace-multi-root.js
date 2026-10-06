/* global __dirname, console, module, process, require, setTimeout, clearTimeout */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const extensionRoot = path.resolve(__dirname, '..');
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const suiteId = 'workspaceMultiRoot';
const expectedPhases = Object.freeze(['runtimeDependencyBootstrap:bootstrap', 'workspaceMultiRoot:create', 'workspaceMultiRoot:reopen']);

function assertNoCallerFuncAdmission(env) {
  assert.ok(
    !env.LA_E2E_CLI_MULTI_ROOT_FUNC_PATH && !env.LA_E2E_CLI_MULTI_ROOT_FUNC_SHA256,
    'Caller-supplied Func path/hash is not admission; identity comes only from successful native bootstrap'
  );
}

function assertAssets(root) {
  const html = path.join(root, 'dist/vs-code-react/index.html');
  assert.ok(fs.statSync(html).isFile() && fs.statSync(html).size > 0, 'Required Data Mapper webview HTML is missing/empty');
  const assets = path.join(root, 'dist/vs-code-react/assets');
  assert.ok(
    fs.readdirSync(assets).some((name) => name.endsWith('.js') && fs.statSync(path.join(assets, name)).size > 0),
    'Required Data Mapper executable webview assets are missing/empty'
  );
  assert.ok(fs.statSync(path.join(root, 'dist/main.js')).size > 0, 'Admitted Logic Apps extension is missing');
}

function validateHandoff(value, context) {
  assert.equal(value.invocation, context.invocation, 'Stale family wizard handoff');
  assert.deepEqual(value.identity, context.identity, 'Wrong job/source family handoff');
  const { entry, launch } = value;
  assert.equal(entry.appType, 'standard');
  assert.equal(entry.wfType, 'Stateful');
  assert.equal(fs.realpathSync(entry.parentDir), context.workspaceParent, 'Wrong wizard-created root');
  assert.ok(
    Date.parse(entry.createdAt) >= Date.parse(context.startedUtc) && Date.parse(entry.createdAt) <= Date.now(),
    'Stale wizard fixture'
  );
  for (const file of [entry.wsFilePath, entry.appDir]) {
    assert.ok(path.isAbsolute(file));
    const real = fs.realpathSync(file);
    const relative = path.relative(context.workspaceParent, real);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Wizard fixture escaped its family root');
    let current = context.workspaceParent;
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Wizard handoff cannot traverse symlinks');
    }
  }
  assert.equal(fs.realpathSync(launch.executable), launch.executable);
  assert.equal(hash(launch.executable), launch.sha256, 'Resolved official Code binary changed');
  assert.ok(typeof launch.version === 'string' && launch.version, 'Creating Code version is required');
  if (context.requestedVersion && context.requestedVersion !== 'stable') {
    assert.equal(launch.version, context.requestedVersion, 'Creating Code differs from the admitted version');
  }
  assert.equal(fs.realpathSync(launch.extensionsDir), fs.realpathSync(context.extensionsDir), 'Prepared extensions changed');
  const folders = JSON.parse(fs.readFileSync(entry.wsFilePath, 'utf8')).folders;
  assert.ok(
    folders.some((folder) => path.resolve(path.dirname(entry.wsFilePath), folder.path) === entry.appDir),
    'Original workspace lacks its same app'
  );
  return { entry, launch };
}

function finalizeResult(result) {
  result.complete =
    result.observationPassed === true &&
    result.evidenceVerified === true &&
    result.originalCodeClose?.code === 0 &&
    result.originalCodeClose?.signal === null &&
    result.diagnosticsVerified === true &&
    result.cleanupVerified === true &&
    result.errors.length === 0 &&
    exactPhasesComplete(result.phaseResults);
  return result;
}

function exactPhasesComplete(phases) {
  return (
    Array.isArray(phases) &&
    phases.every((phase) => phase && typeof phase === 'object') &&
    JSON.stringify(phases.map((phase) => phase.phaseId)) === JSON.stringify(expectedPhases) &&
    phases.every(
      (phase) =>
        phase.complete === true &&
        phase.exitCode === 0 &&
        (phase.signal === null || phase.signal === undefined) &&
        phase.cleanupVerified === true &&
        !phase.diagnosticsError
    )
  );
}

function readFamilyPhases(file) {
  return fs.existsSync(file)
    ? fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];
}

function assertEvidence(observation, funcExecutable, funcSha256) {
  assert.ok(observation && observation.mapperOpened === true, 'Actual Mapper observation is required');
  assert.ok(
    Array.isArray(observation.roots) && observation.roots.length >= 2 && new Set(observation.roots).size === observation.roots.length
  );
  assert.ok(
    observation.originalBoot && observation.reloadedBoot && observation.originalBoot !== observation.reloadedBoot,
    'Real fresh-host reload evidence is required'
  );
  assert.equal(observation.population?.complete, true);
  assert.equal(observation.runtimeResolution?.command, 'func', 'Actual post-reload ensureBinaries command was not observed');
  assert.equal(observation.runtimeResolution?.managedValidation, false);
  assert.equal(observation.runtimeResolution?.executable, funcExecutable, 'Post-reload activation resolved the wrong Func');
  assert.equal(observation.runtimeResolution?.sha256, funcSha256, 'Post-reload activation resolved different Func bytes');
  assert.ok(
    observation.population.stability?.samples >= 3 && observation.population.stability?.durationMs >= 1500,
    'Native population stability evidence is required'
  );
  assert.ok(
    observation.reload?.targetId &&
      observation.reload.before.timeOrigin !== observation.reload.after.timeOrigin &&
      observation.reload.afterGeneration > observation.reload.beforeGeneration,
    'Same-target real document/context reload evidence is required'
  );
  assert.equal(
    observation.population.processes.length,
    observation.roots.length,
    'Full func executable population must equal actual Logic App roots'
  );
  for (const record of observation.population.processes) {
    assert.equal(record.executable, funcExecutable);
    assert.equal(record.sha256, funcSha256);
  }
  assert.ok(
    Array.isArray(observation.screenshots) && observation.screenshots.length === observation.roots.length + 3,
    'Required phase screenshots are missing'
  );
  assert.equal(new Set(observation.screenshots).size, observation.screenshots.length, 'Reused screenshots cannot credit distinct phases');
  for (const file of observation.screenshots) {
    const bytes = fs.readFileSync(file);
    assert.ok(
      bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'Real screenshot PNG required'
    );
    const sidecar = JSON.parse(fs.readFileSync(file.replace(/\.png$/, '.json'), 'utf8'));
    assert.equal(sidecar.classification, 'evidence');
    assert.equal(sidecar.verdict, 'accepted');
    assert.equal(sidecar.target?.owner, 'workbench');
    assert.equal(sidecar.checkpoint, path.basename(file, '.png'));
    assert.ok(sidecar.target?.opaqueTargetId && Number.isInteger(sidecar.target?.generation));
  }
}

async function runWorkspaceMultiRoot({ runVscodeTest, collectVscodeProfileLogs, writeSuitePhaseResult }, env = process.env) {
  assert.equal(
    env.LA_E2E_CLI_MULTI_ROOT_ISOLATED,
    '1',
    'Full func population requires an isolated native consumer, not a shared workstation'
  );
  assert.ok(['win32', 'linux'].includes(process.platform));
  assertAssets(extensionRoot);
  assert.ok(
    env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT && env.LA_E2E_CLI_EXTENSIONS_DIR,
    'Prepared same-job native dependencies/extensions are required'
  );
  assertNoCallerFuncAdmission(env);
  assert.equal(typeof writeSuitePhaseResult, 'function', 'Official suite phase reporter is required');
  const ui = require('../out/test/e2e/workspaceMultiRoot.test');
  const { readBootstrapAttestation } = require('../out/test/e2e/workspaceMultiRootBootstrap');
  const { multiRootRegularLaunch } = require('../out/test/e2e/workspaceMultiRootLaunch');
  const { closeWorkspacePromptCancelWindow } = require('../out/test/e2e/workspacePromptCancel');
  const recorder = path.join(__dirname, 'fixtures/workspace-multi-root-recorder');
  for (const file of ['package.json', 'extension.js']) {
    assert.ok(fs.statSync(path.join(recorder, file)).size > 0, 'Current-source multi-root debug observer fixture is required');
  }
  const root = fs.mkdtempSync(path.join(env.LA_E2E_CLI_WORKSPACE_ROOT || os.tmpdir(), 'la-multi-root-'));
  const diagnosticRoot = fs.mkdtempSync(
    path.join(env.LA_E2E_CLI_MULTI_ROOT_DIAGNOSTICS_PARENT || path.join(extensionRoot, '.vscode-test'), 'multi-root-')
  );
  const context = {
    suiteId,
    invocation: randomUUID(),
    identity: {
      source: env.BUILD_SOURCEVERSION || 'local',
      run: env.BUILD_BUILDID || 'local',
      job: env.SYSTEM_JOBID || 'local',
      platform: process.platform,
    },
    startedUtc: new Date().toISOString(),
    requestedVersion: env.LA_E2E_CLI_VSCODE_VERSION || 'stable',
    runtimeRoot: fs.realpathSync(env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT),
    workspaceParent: fs.realpathSync(root),
    extensionsDir: env.LA_E2E_CLI_EXTENSIONS_DIR,
  };
  fs.writeFileSync(path.join(diagnosticRoot, 'invocation.json'), JSON.stringify(context), { flag: 'wx' });
  const handoffPath = path.join(diagnosticRoot, 'wizard-handoff.json');
  const eventsFile = path.join(diagnosticRoot, 'debug-events.jsonl');
  const bootstrapAttestationPath = path.join(diagnosticRoot, 'func-bootstrap.json');
  const phaseFile = env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH || path.join(diagnosticRoot, 'phases.jsonl');
  assert.ok(!fs.existsSync(phaseFile), 'Multi-root phases must be fresh for this invocation');
  const phaseEnv = { ...env, LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: phaseFile };
  const result = {
    schemaVersion: 1,
    suiteId,
    expectedPhaseIds: expectedPhases,
    scenario: 'workspace-multi-root',
    invocation: context.invocation,
    identity: context.identity,
    observationPassed: false,
    evidenceVerified: false,
    complete: false,
    originalCodeClose: null,
    diagnosticsVerified: false,
    cleanupVerified: false,
    errors: [],
  };
  let completion;
  let child;
  let profile;
  let reopenStarted = false;
  const previousPort = process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
  const previousScreenshots = process.env.LA_E2E_CLI_SCREENSHOT_DIR;
  try {
    // Real official dependency validation, not a fabricated preflight-success phase.
    // A prepared direct root may be nonempty; only a genuinely empty batch root
    // is reported as starting empty.
    const runtimeEmpty = fs.readdirSync(env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT).length === 0;
    const bootstrapCode = await runVscodeTest(['--label', 'runtimeDependencyBootstrap'], {
      extraEnv: {
        ...phaseEnv,
        LA_E2E_CLI_INCLUDE_RUNTIME_DEPENDENCY_BOOTSTRAP: '1',
        LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_CONTEXT: JSON.stringify(context),
        LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_ATTESTATION: bootstrapAttestationPath,
        LA_E2E_CLI_CREATE_WORKSPACE_CASE: '',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
        LA_E2E_STRICT_DEPENDENCY_VALIDATION: '1',
        LA_E2E_CLI_EXPECT_EMPTY_RUNTIME_DEPENDENCIES_ROOT: runtimeEmpty ? '1' : '0',
        LA_E2E_CLI_EMPTY_RUNTIME_DEPENDENCIES_ROOT_CONFIRMED: runtimeEmpty ? '1' : '0',
        LA_E2E_CLI_PROFILE_PHASE: 'workspace-multi-root-bootstrap',
        LA_E2E_CLI_USER_DATA_SUFFIX: `multi-root-bootstrap-${context.invocation}`,
      },
    });
    assert.equal(bootstrapCode, 0, 'Official multi-root runtime bootstrap failed');
    const bootstrapPhases = readFamilyPhases(phaseFile);
    assert.equal(bootstrapPhases.length, 1, 'Bootstrap admission requires exactly its actual first phase');
    const bootstrap = readBootstrapAttestation(bootstrapAttestationPath, context, bootstrapPhases[0]);
    if (context.requestedVersion !== 'stable') {
      assert.equal(bootstrap.vscodeVersion, context.requestedVersion, 'Bootstrap Code differs from the admitted native version');
    }
    const { executable: funcExecutable, sha256: funcSha256 } = bootstrap.binary;
    result.funcAdmission = { source: 'successful-native-bootstrap', attestationPath: bootstrapAttestationPath, binary: bootstrap.binary };
    const code = await runVscodeTest(['--label', 'createWorkspaceCoreMatrix'], {
      workspaceParent: root,
      retainWorkspaceForSupplement: true,
      multiRootCreatePhase: true,
      extraEnv: {
        ...phaseEnv,
        LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful',
        LA_E2E_CLI_PRESERVE_WORKSPACES: '1',
        LA_E2E_CLI_MULTI_ROOT_CONTEXT: JSON.stringify(context),
        LA_E2E_CLI_MULTI_ROOT_HANDOFF: handoffPath,
        LA_E2E_CLI_PROFILE_PHASE: 'workspace-multi-root-create',
        LA_E2E_CLI_USER_DATA_SUFFIX: `multi-root-create-${context.invocation}`,
      },
    });
    assert.equal(code, 0, 'Official wizard setup failed');
    const { entry, launch } = validateHandoff(JSON.parse(fs.readFileSync(handoffPath, 'utf8')), context);
    profile = fs.mkdtempSync(path.join(env.LA_E2E_CLI_USER_DATA_PARENT || os.tmpdir(), 'um-'));
    if (process.platform === 'linux') {
      assert.ok(Buffer.byteLength(path.join(profile, 'main.sock')) < 100, 'Native profile socket path exceeds byte budget');
    }
    fs.mkdirSync(path.join(profile, 'User'));
    const regularLaunch = multiRootRegularLaunch(bootstrap, env, profile);
    fs.writeFileSync(path.join(profile, 'User/settings.json'), JSON.stringify(regularLaunch.settings));
    process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT || '9527';
    process.env.LA_E2E_CLI_SCREENSHOT_DIR = path.join(diagnosticRoot, 'screenshots');
    const args = [
      ...(process.platform === 'linux' ? ['--password-store=gnome-libsecret'] : []),
      `--user-data-dir=${profile}`,
      `--extensions-dir=${launch.extensionsDir}`,
      `--extensionDevelopmentPath=${path.join(extensionRoot, 'dist')}`,
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
      `--remote-debugging-port=${process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT}`,
      '--remote-debugging-address=127.0.0.1',
      entry.wsFilePath,
    ];
    fs.writeFileSync(path.join(diagnosticRoot, 'code.log'), '', { flag: 'wx' });
    child = spawn(launch.executable, args, {
      env: {
        ...regularLaunch.env,
        LA_E2E_CLI_MULTI_ROOT_EVENTS: eventsFile,
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    reopenStarted = true;
    completion = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => {
        result.originalCodeClose = { code, signal };
        resolve(result.originalCodeClose);
      });
    });
    completion.catch((error) => result.errors.push(String(error)));
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (data) => {
        try {
          fs.appendFileSync(path.join(diagnosticRoot, 'code.log'), data);
        } catch (error) {
          result.errors.push(String(error));
        }
      });
    }
    result.observation = await Promise.race([
      ui.runWorkspaceMultiRootUi({ workspace: entry, eventsFile, bootstrap, funcExecutable, funcSha256, deadline: Date.now() + 1200000 }),
      completion.then(() => {
        throw new Error('Original Code closed before multi-root observation completed');
      }),
    ]);
    assertEvidence(result.observation, funcExecutable, funcSha256);
    result.evidenceVerified = true;
    result.observationPassed = true;
  } catch (error) {
    result.errors.push(String(error));
  } finally {
    if (completion && !result.originalCodeClose) {
      try {
        await closeWorkspacePromptCancelWindow(!result.observationPassed);
        let timer;
        try {
          await Promise.race([
            completion,
            new Promise((_resolve, reject) => {
              timer = setTimeout(() => reject(new Error('Original Code did not close normally; no forced process cleanup')), 10000);
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      } catch (error) {
        result.errors.push(String(error));
        child.unref();
        child.stdout.destroy();
        child.stderr.destroy();
      }
    }
    if (profile) {
      try {
        collectVscodeProfileLogs('workspaceMultiRoot', {
          ...env,
          LA_E2E_CLI_USER_DATA_DIR: profile,
          LA_E2E_CLI_PROFILE_PHASE: 'workspace-multi-root',
          LA_E2E_CLI_VSCODE_LOG_DIR: path.join(diagnosticRoot, 'vscode-logs'),
        });
        result.diagnosticsVerified = fs.existsSync(path.join(diagnosticRoot, 'vscode-logs'));
      } catch (error) {
        result.errors.push(String(error));
      }
    }
    if (
      result.observationPassed &&
      result.originalCodeClose?.code === 0 &&
      result.originalCodeClose?.signal === null &&
      result.errors.length === 0 &&
      result.diagnosticsVerified
    ) {
      try {
        fs.rmSync(root, { recursive: true });
        result.cleanupVerified = !fs.existsSync(root);
      } catch (error) {
        result.errors.push(String(error));
      }
    }
    if (previousPort === undefined) {
      delete process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
    } else {
      process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = previousPort;
    }
    if (previousScreenshots === undefined) {
      delete process.env.LA_E2E_CLI_SCREENSHOT_DIR;
    } else {
      process.env.LA_E2E_CLI_SCREENSHOT_DIR = previousScreenshots;
    }
    try {
      if (reopenStarted) {
        // Reopen encompasses the actual fresh regular window, Explorer additions,
        // same-window Reload Window, count/debug/Mapper assertions and final teardown.
        const phasePassed =
          result.observationPassed &&
          result.evidenceVerified &&
          result.originalCodeClose?.code === 0 &&
          result.originalCodeClose?.signal === null &&
          result.diagnosticsVerified &&
          result.cleanupVerified &&
          result.errors.length === 0;
        writeSuitePhaseResult(phaseEnv, {
          suiteId,
          label: suiteId,
          phaseId: 'workspaceMultiRoot:reopen',
          complete: phasePassed,
          exitCode: phasePassed ? 0 : 1,
          signal: result.originalCodeClose?.signal ?? null,
          cleanupVerified: result.cleanupVerified,
          diagnosticsError: result.errors.join('; ') || (phasePassed ? '' : 'multi-root-reopen-not-finalized'),
        });
      }
      result.phaseResults = readFamilyPhases(phaseFile);
    } catch (error) {
      result.errors.push(String(error));
      result.phaseResults = [];
    }
    result.observedPhaseIds = result.phaseResults.map((phase) => phase.phaseId);
    finalizeResult(result);
    result.lifecycleFinalized = true;
    result.exitCode = result.complete ? 0 : 1;
    result.signal = result.originalCodeClose?.signal ?? null;
    fs.writeFileSync(path.join(diagnosticRoot, 'final-result.json'), JSON.stringify(result, null, 2));
  }
  console.log(`[${suiteId}] complete=${result.complete}; native diagnostics=${diagnosticRoot}`);
  return result.complete ? 0 : 1;
}

module.exports = {
  assertNoCallerFuncAdmission,
  suiteId,
  expectedPhases,
  exactPhasesComplete,
  assertAssets,
  validateHandoff,
  assertEvidence,
  finalizeResult,
  runWorkspaceMultiRoot,
};
