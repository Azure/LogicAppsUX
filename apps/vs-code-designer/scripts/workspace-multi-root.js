/* global __dirname, console, module, process, require, setTimeout, clearTimeout */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const extensionRoot = path.resolve(__dirname, '..');
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

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
    result.errors.length === 0;
  return result;
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

async function runWorkspaceMultiRoot({ runVscodeTest, collectVscodeProfileLogs }, env = process.env) {
  assert.equal(
    env.LA_E2E_CLI_MULTI_ROOT_ISOLATED,
    '1',
    'Full func population requires an isolated native consumer, not a shared workstation'
  );
  assert.ok(['win32', 'linux'].includes(process.platform));
  assertAssets(extensionRoot);
  const funcExecutable = fs.realpathSync(env.LA_E2E_CLI_MULTI_ROOT_FUNC_PATH || '');
  assert.ok(/^func(?:\.exe)?$/i.test(path.basename(funcExecutable)), 'Admitted executable must be func, not dotnet');
  const funcSha256 = hash(funcExecutable);
  assert.equal(funcSha256, env.LA_E2E_CLI_MULTI_ROOT_FUNC_SHA256, 'Admitted native func SHA-256 is required');
  assert.ok(
    env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT && env.LA_E2E_CLI_EXTENSIONS_DIR,
    'Prepared same-job native dependencies/extensions are required'
  );
  assert.equal(
    funcExecutable,
    fs.realpathSync(
      path.join(env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT, 'FuncCoreTools', process.platform === 'win32' ? 'func.exe' : 'func')
    ),
    'Collector oracle must use the same executable as product design-time startup'
  );
  const ui = require('../out/test/e2e/workspaceMultiRoot.test');
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
    invocation: randomUUID(),
    identity: {
      source: env.BUILD_SOURCEVERSION || 'local',
      run: env.BUILD_BUILDID || 'local',
      job: env.SYSTEM_JOBID || 'local',
      platform: process.platform,
    },
    startedUtc: new Date().toISOString(),
    requestedVersion: env.LA_E2E_CLI_VSCODE_VERSION || 'stable',
    workspaceParent: fs.realpathSync(root),
    extensionsDir: env.LA_E2E_CLI_EXTENSIONS_DIR,
  };
  fs.writeFileSync(path.join(diagnosticRoot, 'invocation.json'), JSON.stringify(context), { flag: 'wx' });
  const handoffPath = path.join(diagnosticRoot, 'wizard-handoff.json');
  const eventsFile = path.join(diagnosticRoot, 'debug-events.jsonl');
  const result = {
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
  const previousPort = process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
  const previousScreenshots = process.env.LA_E2E_CLI_SCREENSHOT_DIR;
  try {
    const code = await runVscodeTest(['--label', 'createWorkspaceCoreMatrix'], {
      workspaceParent: root,
      retainWorkspaceForSupplement: true,
      extraEnv: {
        LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful',
        LA_E2E_CLI_PRESERVE_WORKSPACES: '1',
        LA_E2E_CLI_MULTI_ROOT_CONTEXT: JSON.stringify(context),
        LA_E2E_CLI_MULTI_ROOT_HANDOFF: handoffPath,
      },
    });
    assert.equal(code, 0, 'Official wizard setup failed');
    const { entry, launch } = validateHandoff(JSON.parse(fs.readFileSync(handoffPath, 'utf8')), context);
    profile = fs.mkdtempSync(path.join(env.LA_E2E_CLI_USER_DATA_PARENT || os.tmpdir(), 'um-'));
    if (process.platform === 'linux') {
      assert.ok(Buffer.byteLength(path.join(profile, 'main.sock')) < 100, 'Native profile socket path exceeds byte budget');
    }
    fs.mkdirSync(path.join(profile, 'User'));
    fs.writeFileSync(
      path.join(profile, 'User/settings.json'),
      JSON.stringify({
        'azureLogicAppsStandard.autoStartDesignTime': true,
        'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': false,
        'azureLogicAppsStandard.autoRuntimeDependenciesPath': env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT,
        'azureLogicAppsStandard.funcCoreToolsBinaryPath': funcExecutable,
        'azureLogicAppsStandard.parameterizeConnectionsInProjectLoad': false,
        'azureLogicAppsStandard.silentAuth': true,
        'azureLogicAppsStandard.autoStartAzurite': true,
        'azurite.location': path.join(profile, 'azurite'),
        'telemetry.telemetryLevel': 'off',
        'update.mode': 'none',
      })
    );
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
        ...env,
        LA_E2E_CLI_MULTI_ROOT_EVENTS: eventsFile,
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
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
      ui.runWorkspaceMultiRootUi({ workspace: entry, eventsFile, funcExecutable, funcSha256, deadline: Date.now() + 1200000 }),
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
    fs.writeFileSync(path.join(diagnosticRoot, 'final-result.json'), JSON.stringify(finalizeResult(result), null, 2));
  }
  console.log(`[workspace-multi-root] complete=${result.complete}; native diagnostics=${diagnosticRoot}`);
  return result.complete ? 0 : 1;
}

module.exports = { assertAssets, validateHandoff, assertEvidence, finalizeResult, runWorkspaceMultiRoot };
