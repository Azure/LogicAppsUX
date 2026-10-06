/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, process, require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const {
  observeMsnCleanupDiagnostics,
  queryWindowsFileLocks,
  recordMsnBodyAssertions,
  readMsnBodyAssertions,
} = require('./msn-cleanup-diagnostics');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const {
  _test: {
    beginDirectMsnEvidence,
    finalizeDirectMsnEvidence,
    finalizeMsnLifecycleCleanup,
    getOwnedRootCleanupVerified,
    runMsnWeatherLifecycle,
    writeSuitePhaseResult,
  },
} = require('./run-e2e-cli');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-msn-finalization-control-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: false }));
  const dependencyRoot = path.join(root, 'dependencies');
  const workspaceRoot = path.join(root, 'workspace');
  fs.mkdirSync(path.join(dependencyRoot, 'FuncCoreTools', 'in-proc8'), { recursive: true });
  fs.mkdirSync(workspaceRoot);
  const resource = path.join(dependencyRoot, 'FuncCoreTools', 'in-proc8', 'AccentedCommandLineParser.dll');
  fs.writeFileSync(resource, 'non-native-control');
  const outputDir = path.join(root, 'observations');
  const env = { LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: path.join(root, 'msnWeatherLifecycle.terminal-result.json') };
  const read = () => JSON.parse(fs.readFileSync(env.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH));
  return { root, dependencyRoot, workspaceRoot, resource, outputDir, env, read };
}

function phases(env) {
  for (const phaseId of SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases) {
    writeSuitePhaseResult(env, {
      label: phaseId.startsWith('runtimeDependencyBootstrap:') ? 'runtimeDependencyBootstrap' : 'msnWeatherLifecycle',
      phaseId,
      exitCode: 0,
      signal: null,
      cleanupVerified: true,
      complete: true,
      diagnosticsError: '',
      mochaPassingCount: 1,
    });
  }
}

test('actual CLI test-config forwarding carries only declared MSN observation and invocation inputs', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '.vscode-test.mjs'), 'utf8');
  const start = source.indexOf('function getForwardedTestEnvironment()');
  const end = source.indexOf('\nfunction failBatchRuntimeDependencyRoot()', start);
  assert.ok(start > 0 && end > start, 'Expected original test-config forwarding function');
  const env = {
    LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION: 'current-invocation-control',
    LA_E2E_CLI_MSN_DIAGNOSTICS_DIR: 'current-diagnostic-directory-control',
    LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL: '1',
    UNRELATED_SECRET_CONTROL: 'must-not-forward',
  };
  const forwarded = vm.runInNewContext(`(${source.slice(start, end)})()`, { process: { env } });
  assert.equal(forwarded.LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION, env.LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION);
  assert.equal(forwarded.LA_E2E_CLI_MSN_DIAGNOSTICS_DIR, env.LA_E2E_CLI_MSN_DIAGNOSTICS_DIR);
  assert.equal(forwarded.LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL, '1');
  assert.equal(forwarded.UNRELATED_SECRET_CONTROL, undefined);
});

test('body receipt is current-invocation assertion evidence only, never a closure/cleanup receipt', (t) => {
  const f = fixture(t);
  const context = { outputDir: f.outputDir, invocation: 'current-body-control' };
  assert.equal(readMsnBodyAssertions(context), false);
  recordMsnBodyAssertions(context);
  assert.equal(readMsnBodyAssertions(context), true);
  assert.throws(() => readMsnBodyAssertions({ ...context, invocation: 'other-body-control' }), /invocation/);
  assert.throws(() => recordMsnBodyAssertions(context), /EEXIST/);
  const receipt = JSON.parse(fs.readFileSync(path.join(f.outputDir, 'body-assertions.json')));
  assert.equal(receipt.cleanupVerified, undefined);
  assert.equal(receipt.complete, undefined);
  assert.equal(receipt.originalProcessClosureVerified, undefined);
});

test('real current-invocation writer cannot finalize while original roots/late cleanup remain', async (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.env.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH, '{"complete":true}');
  const journalEnv = beginDirectMsnEvidence(f.env);
  assert.equal(f.read().complete, false, 'Invalidate prior success before any phase');
  phases({ ...f.env, ...journalEnv });
  assert.equal(f.read().complete, false, 'Three passing real phase records still do not finalize the lifecycle');
  const sequence = [];
  const lock = Object.assign(new Error('dependency-file-locked-control'), { code: 'EPERM', path: f.resource });
  await assert.rejects(
    finalizeMsnLifecycleCleanup({
      cleanupSteps: [
        async () => {
          sequence.push('required-diagnostics');
          assert.ok(fs.existsSync(f.workspaceRoot));
          assert.ok(fs.existsSync(f.dependencyRoot));
        },
        async () => {
          sequence.push('workspace-removal');
          fs.rmSync(f.workspaceRoot, { recursive: true, force: false });
          assert.equal(f.read().complete, false);
        },
        async () => {
          sequence.push('late-dependency-lock');
          throw lock;
        },
      ],
      observeCleanup: () => {
        sequence.push('observe-both-roots');
        return getOwnedRootCleanupVerified([f.workspaceRoot, f.dependencyRoot]);
      },
      finalizeEvidence: (outcome) => {
        sequence.push('terminal');
        return finalizeDirectMsnEvidence(f.env, {
          ...outcome,
          lifecycleSucceeded: true,
          phaseResultsPath: journalEnv.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH,
          ownedRoots: [f.workspaceRoot, f.dependencyRoot],
        });
      },
    }),
    (error) => {
      assert.deepEqual(error.errors, [lock], 'Keep the original cleanup error, not a success-shaped wrapper result');
      return true;
    }
  );
  assert.deepEqual(sequence, ['required-diagnostics', 'workspace-removal', 'late-dependency-lock', 'observe-both-roots', 'terminal']);
  const terminal = f.read();
  assert.equal(terminal.lifecycleBodySucceeded, true);
  assert.equal(terminal.phaseCompleteness, true);
  assert.equal(terminal.lifecycleFinalized, true);
  assert.equal(terminal.complete, false);
  assert.equal(terminal.cleanupVerified, false);
  assert.equal(terminal.exitCode, 1);
  assert.equal(terminal.originalProcessClosureVerified, false);
  assert.equal(terminal.phaseResults.length, 3);
  assert.deepEqual(terminal.failureReasons, [lock.message]);
  assert.ok(fs.existsSync(f.resource));
  const ledger = JSON.parse(fs.readFileSync(path.join(f.root, 'msnWeatherLifecycle.cleanup-ledger.json')));
  assert.equal(ledger.filesystemCleanupVerified, false);
  assert.equal(ledger.verified, false);
});

test('no identities, empty post-exit observations and actual root absence cannot manufacture closure', (t) => {
  const f = fixture(t);
  const journalEnv = beginDirectMsnEvidence(f.env);
  phases({ ...f.env, ...journalEnv });
  fs.rmSync(f.workspaceRoot, { recursive: true, force: false });
  fs.rmSync(f.dependencyRoot, { recursive: true, force: false });
  const terminal = finalizeDirectMsnEvidence(f.env, {
    lifecycleSucceeded: true,
    cleanupVerified: getOwnedRootCleanupVerified([f.workspaceRoot, f.dependencyRoot]),
    phaseResultsPath: journalEnv.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH,
  });
  assert.equal(terminal.filesystemCleanupVerified, true);
  assert.equal(terminal.complete, false);
  assert.equal(terminal.cleanupVerified, false);
  assert.equal(terminal.processClosureProof, 'original-identities-unverified');
});

test('fresh journaling cannot reuse an earlier complete phase sequence', (t) => {
  const f = fixture(t);
  const old = beginDirectMsnEvidence(f.env);
  phases({ ...f.env, ...old });
  const current = beginDirectMsnEvidence(f.env);
  assert.notEqual(current.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH, old.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH);
  const terminal = finalizeDirectMsnEvidence(f.env, {
    lifecycleSucceeded: false,
    cleanupVerified: false,
    phaseResultsPath: current.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH,
  });
  assert.equal(terminal.phaseCompleteness, false);
  assert.deepEqual(terminal.phaseResults, []);
});

test('lock observation joins native PID plus creation identity, never PID alone; foreign processes remain diagnostics', async (t) => {
  const f = fixture(t);
  const executable = path.join(f.dependencyRoot, 'FuncCoreTools', 'in-proc8', 'func.exe');
  const scoped = { pid: 23, parentPid: 17, creationIdentity: '100', executable };
  const foreign = { pid: 24, parentPid: 99, creationIdentity: '300', executable: path.join(f.root, 'foreign.exe') };
  const observation = await observeMsnCleanupDiagnostics(
    { ...f, stage: 'before-task-teardown' },
    {
      platform: 'win32',
      queryLocks: (resource) => {
        assert.equal(resource, f.resource);
        return [
          { pid: 23, creationIdentity: '100' },
          { pid: 24, creationIdentity: '300' },
          { pid: 23, creationIdentity: '999' },
        ];
      },
      snapshot: async (budget) => {
        assert.equal(budget, 10_000);
        return [
          { ...scoped, commandLine: 'must-not-persist-command-line', environment: 'must-not-persist-environment' },
          { ...foreign, commandLine: 'must-not-persist-command-line' },
        ];
      },
    }
  );
  assert.deepEqual(observation.dependencyExecutableCandidates, [scoped]);
  assert.deepEqual(
    observation.fileLockHolders.map((record) => record.identityMatched),
    [true, true, false]
  );
  assert.deepEqual(observation.fileLockHolders[1].process, foreign);
  assert.equal(observation.fileLockHolders[2].process, undefined);
  assert.equal(observation.originalProcessClosureVerified, false);
  assert.equal(observation.fileLockObservationAvailable, true);
  assert.equal(observation.processObservationAvailable, true);
  assert.doesNotMatch(JSON.stringify(observation), /must-not-persist/);
});

test('failed lock acquisition persists available process diagnostics and retains the exact native error', async (t) => {
  const f = fixture(t);
  const error = Object.assign(new Error('lock-list-changed-control'), { code: 'NATIVE_CONTROL' });
  await assert.rejects(
    observeMsnCleanupDiagnostics(
      { ...f, stage: 'after-task-teardown' },
      {
        platform: 'win32',
        queryLocks: () => {
          throw error;
        },
        snapshot: async () => [],
      }
    ),
    (failure) => {
      assert.deepEqual(failure.errors, [error]);
      return true;
    }
  );
  const partial = JSON.parse(fs.readFileSync(path.join(f.outputDir, 'after-task-teardown.json')));
  assert.equal(partial.fileLockObservationAvailable, false);
  assert.equal(partial.processObservationAvailable, true);
  assert.equal(partial.originalProcessClosureVerified, false);
  assert.equal(partial.observationErrors[0].code, 'NATIVE_CONTROL');
  assert.ok(fs.existsSync(f.resource));
});

test('read-only bounded Restart Manager script never registers processes, shuts down, retries or uses command lines', () => {
  const read = (reply) =>
    queryWindowsFileLocks('D:\\owned\\file.dll', (command, args, options) => {
      assert.equal(command, 'powershell.exe');
      assert.equal(options.timeout, 10_000);
      assert.equal(JSON.parse(options.input), 'D:\\owned\\file.dll');
      assert.match(args.at(-1), /RmRegisterResources\(session, 1, new string\[\] \{ file \}, 0, null, 0, null\)/);
      assert.doesNotMatch(args.at(-1), /RmShutdown|RmRestart|Stop-Process|taskkill|CommandLine|Start-Sleep/);
      assert.match(args.at(-1), /ConvertTo-Json -InputObject @/);
      return reply;
    });
  assert.deepEqual(read('[]'), []);
  assert.deepEqual(read('[{"pid":23,"creationIdentity":"100"}]'), [{ pid: 23, creationIdentity: '100' }]);
  for (const reply of ['{}', '', '[{"pid":0,"creationIdentity":"100"}]', '[{"pid":23,"creationIdentity":""}]']) {
    assert.throws(() => read(reply));
  }
});

test('compile the actual interop declaration and verify marshaled layout without invoking any Restart Manager API', () => {
  let script;
  queryWindowsFileLocks('unused-control-path', (_command, args) => {
    script = args.at(-1).slice(0, args.at(-1).lastIndexOf('$file='));
    return '[]';
  });
  assert.doesNotMatch(script, /\[MsnFileLocks\]::Read/);
  script += `
if([Runtime.InteropServices.Marshal]::SizeOf([type][MsnFileLocks+UniqueProcess]) -ne 12){throw 'Invalid RM process layout'}
if([Runtime.InteropServices.Marshal]::SizeOf([type][MsnFileLocks+Info]) -ne 668){throw 'Invalid RM info layout'}
Write-Output 'interop-declaration-compiled-without-native-invocation'
`;
  const result = execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    timeout: 30_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.match(result, /interop-declaration-compiled-without-native-invocation/);
});

for (const [failedBody, recordedBody] of [
  [false, false],
  [true, false],
  [true, true],
]) {
  test(`actual MSN orchestrator ${recordedBody ? 'preserves passing assertions despite late inner cleanup failure' : failedBody ? 'retains original body error' : 'separates passing body'} and fails closed without identity proof`, async (t) => {
    const f = fixture(t);
    const changes = {
      ...f.env,
      LA_E2E_CLI_SUITE_WRAPPER_CHILD: undefined,
      LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: path.join(f.root, 'inherited-old-journal.jsonl'),
      LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT: path.join(f.root, 'lifecycle'),
      LA_E2E_CLI_WORKSPACE_ROOT: path.join(f.root, 'workspaces'),
    };
    const previous = Object.fromEntries(Object.keys(changes).map((key) => [key, process.env[key]]));
    let dependencies;
    let workspace;
    const sequence = [];
    const original = new Error(recordedBody ? 'late-msn-inner-cleanup-control' : 'original-msn-body-control');
    try {
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      await assert.rejects(
        runMsnWeatherLifecycle(undefined, {
          ensureProfile: () => undefined,
          azureEnvironment: () => ({}),
          probe: async () => 'non-native probe control only',
          runPhase: async (args, { extraEnv: env }) => {
            assert.equal(env.LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL, '1');
            sequence.push(env.LA_E2E_CLI_PROFILE_PHASE);
            dependencies = env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT;
            workspace ||= env.LA_E2E_CLI_WORKSPACE_PARENT;
            const phaseId =
              args[1] === 'runtimeDependencyBootstrap'
                ? 'runtimeDependencyBootstrap:bootstrap'
                : `msnWeatherLifecycle:${env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE === 'create' ? 'create' : 'run'}`;
            if (env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE === 'create') {
              const appDir = path.join(workspace, 'workspace', 'app');
              fs.mkdirSync(appDir, { recursive: true });
              fs.writeFileSync(
                env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST,
                JSON.stringify([{ label: 'standard', appDir, workspaceFilePath: path.join(workspace, 'control.code-workspace') }])
              );
            }
            if (recordedBody && phaseId.endsWith(':run')) {
              recordMsnBodyAssertions({
                outputDir: env.LA_E2E_CLI_MSN_DIAGNOSTICS_DIR,
                invocation: env.LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION,
              });
            }
            writeSuitePhaseResult(
              { ...f.env, ...env },
              {
                label: args[1],
                phaseId,
                exitCode: failedBody && phaseId.endsWith(':run') ? 1 : 0,
                signal: null,
                complete: !(failedBody && phaseId.endsWith(':run')),
                cleanupVerified: true,
                diagnosticsError: '',
                mochaPassingCount: 1,
              }
            );
            assert.equal(f.read().complete, false, 'The native launch seam may never observe a premature terminal');
            if (failedBody && phaseId.endsWith(':run')) {
              throw original;
            }
          },
          observe: async ({ stage }) => {
            sequence.push(stage);
            assert.ok(fs.existsSync(dependencies));
            assert.ok(fs.existsSync(workspace));
            assert.equal(f.read().complete, false);
          },
        }),
        (error) => {
          assert.equal(error.errors.length, failedBody ? 2 : 1);
          if (failedBody) {
            assert.equal(error.errors[0], original);
          }
          assert.match(error.errors.at(-1).message, /original process identity closure is unverified/);
          return true;
        }
      );
      assert.deepEqual(sequence, ['msn-weather-bootstrap', 'msn-weather-create', 'msn-weather-run', 'after-cli-close']);
      assert.ok(fs.existsSync(dependencies), 'Keep the original dependency evidence; do not remove it on unproven closure');
      assert.ok(fs.existsSync(workspace), 'Keep the original generated fixture');
      const terminal = f.read();
      assert.equal(terminal.lifecycleBodySucceeded, !failedBody || recordedBody);
      assert.equal(terminal.complete, false);
      assert.equal(terminal.cleanupVerified, false);
      assert.equal(terminal.exitCode, 1);
      assert.equal(terminal.lifecycleFinalized, true);
      assert.equal(terminal.phaseResults.length, 3);
      if (failedBody) {
        assert.equal(terminal.failureReasons[0], original.message);
      }
      assert.notEqual(terminal.phaseResultsPath, changes.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH);
      assert.equal(fs.existsSync(changes.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH), false);
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      if (dependencies) {
        fs.rmSync(dependencies, { recursive: true, force: false });
      }
    }
  });
}
