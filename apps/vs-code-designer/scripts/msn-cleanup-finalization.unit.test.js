/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, process, require, URL */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const {
  _test: { writeSingleResult },
} = require('./summarize-e2e-cli-results');
const { createMsnFinalizationReport } = require('./msn-finalization-reporting');
const {
  closeOwnedMsnProcesses,
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

function reportFixture(t) {
  const f = fixture(t);
  f.root = path.join(f.root, 'results');
  fs.mkdirSync(f.root);
  f.env.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH = path.join(f.root, 'msnWeatherLifecycle.terminal-result.json');
  const log = path.join(f.root, 'msnWeatherLifecycle.log');
  fs.writeFileSync(
    log,
    [
      '  √ actual MSN body scenario (1ms)',
      '  1 passing (1s)',
      'Extension host exited with code: 0',
      '[generated-workspace-diagnostics] Error: EBUSY workspace locked callback=https://example.test/callback?sig=raw-sas https://raw-user:raw-password@example.test/cleanup',
      '[runtime-deps] Error: EPERM AccentedCommandLineParser.dll Authorization: Bearer raw-bearer',
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    f.env.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH,
    JSON.stringify({
      label: 'msnWeatherLifecycle',
      complete: true,
      cleanupVerified: true,
      exitCode: 0,
      signal: null,
      phaseResults: ['create', 'run'].map((phase) => ({
        phaseId: `msnWeatherLifecycle:${phase}`,
        complete: true,
        cleanupVerified: true,
        exitCode: 0,
      })),
      privateCatalogue: 'must-not-copy-private-catalogue',
      failureReasons: ['EPERM client_secret=raw-client-secret'],
    })
  );
  return {
    ...f,
    options: {
      label: 'msnWeatherLifecycle',
      log,
      outDir: f.root,
      outcome: 'failure',
      diagnosticsArtifactName: 'vscode-e2e-cli-diagnostics-windows-msn-weather-lifecycle',
    },
  };
}

test('post-Code cleanup failure gets a real sanitized text attachment on the synthetic testcase, not the passing body', (t) => {
  const f = reportFixture(t);
  assert.throws(() => writeSingleResult(f.options), /unsuccessful-wrapper/);
  const result = JSON.parse(fs.readFileSync(path.join(f.root, 'msnWeatherLifecycle.json')));
  assert.deepEqual(result.executedTestCounts, { total: 1, passing: 1, failing: 0, pending: 0 });
  assert.equal(result.harnessFailures[0].kind, 'lifecycle-evidence');
  assert.equal(result.failureAttachments.length, 1);
  const attachment = result.failureAttachments[0];
  assert.equal(attachment.testTitle, 'MSN lifecycle evidence');
  assert.equal(attachment.evidenceKind, 'cleanup-finalization-diagnostics');
  assert.equal(attachment.screenshotPath, undefined);
  const evidence = fs.readFileSync(attachment.attachmentPath, 'utf8');
  assert.match(evidence, /L4: .*EBUSY/);
  assert.match(evidence, /L5: .*EPERM.*AccentedCommandLineParser\.dll/);
  assert.match(evidence, /may predate outer cleanup; not acceptance/);
  assert.match(evidence, /No failing UI screenshot is implied/);
  assert.doesNotMatch(evidence, /raw-sas|raw-bearer|raw-client-secret|raw-password|raw-user|must-not-copy-private-catalogue/);
  const xml = fs.readFileSync(path.join(f.root, 'msnWeatherLifecycle.junit.xml'), 'utf8');
  assert.match(xml, /name="actual MSN body scenario" \/>/);
  const synthetic = xml.slice(xml.indexOf('name="MSN lifecycle evidence"'));
  assert.match(synthetic, /\[\[ATTACHMENT\|.*msnWeatherLifecycle\.cleanup-finalization\.txt\]\]/);
  assert.match(synthetic, /vscode-e2e-cli-diagnostics-windows-msn-weather-lifecycle\/log\/msnWeatherLifecycle.log/);
  assert.doesNotMatch(xml, /raw-sas|raw-bearer|raw-client-secret|raw-password|raw-user/);
});

test('a successful response PNG is never attached to the synthetic failure, even if a manifest incorrectly gives it that title', (t) => {
  const f = reportFixture(t);
  const screenshots = path.join(f.root, '..', 'screenshots', 'cli');
  fs.mkdirSync(screenshots, { recursive: true });
  t.after(() => fs.rmSync(path.dirname(screenshots), { recursive: true, force: true }));
  const png = path.join(f.root, 'successful-response.png');
  fs.writeFileSync(png, 'non-native successful image fixture');
  fs.writeFileSync(
    path.join(screenshots, 'failure-attachments.json'),
    JSON.stringify([{ label: 'msnWeatherLifecycle', testTitle: 'MSN lifecycle evidence', screenshotPath: png }])
  );
  assert.throws(() => writeSingleResult(f.options), /unsuccessful-wrapper/);
  const xml = fs.readFileSync(path.join(f.root, 'msnWeatherLifecycle.junit.xml'), 'utf8');
  const result = JSON.parse(fs.readFileSync(path.join(f.root, 'msnWeatherLifecycle.json')));
  assert.equal(result.failureAttachments.length, 1);
  assert.equal(result.failureAttachments[0].screenshotPath, undefined);
  assert.doesNotMatch(xml, /\[\[ATTACHMENT\|[^\]]*\.png\]\]/);
  assert.match(xml, /\[\[ATTACHMENT\|[^\]]*\.txt\]\]/);
});

test('missing terminal still associates actual cleanup log evidence without fabricating terminal claims', (t) => {
  const f = reportFixture(t);
  fs.unlinkSync(f.env.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH);
  assert.throws(() => writeSingleResult(f.options), /missing-required-terminal/);
  const contents = fs.readFileSync(path.join(f.root, 'msnWeatherLifecycle.cleanup-finalization.txt'), 'utf8');
  assert.match(contents, /No readable terminal was supplied/);
  assert.match(contents, /EBUSY/);
});

test('synthetic failure carries deterministic exact run/task and artifact references for uploader-independent navigation', (t) => {
  const f = reportFixture(t);
  const evidence = createMsnFinalizationReport({
    result: {
      label: 'msnWeatherLifecycle',
      outcome: 'failure',
      generatedAt: 'control-time',
      executedTestCounts: { passing: 1, failing: 0, total: 1, pending: 0 },
      harnessFailures: [{ name: 'MSN lifecycle evidence', kind: 'lifecycle-evidence', message: 'actual cleanup failure control' }],
    },
    terminal: null,
    logText: 'Error: EPERM original dependency cleanup',
    outDir: f.root,
    diagnosticsArtifactName: f.options.diagnosticsArtifactName,
    env: {
      SYSTEM_COLLECTIONURI: 'https://dev.azure.com/control-org/',
      SYSTEM_TEAMPROJECTID: 'control-project',
      BUILD_BUILDID: '410',
      SYSTEM_JOBID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      SYSTEM_TASKINSTANCEID: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
  });
  const task = evidence.references.find((reference) => reference.title === 'Exact producing run task log');
  const url = new URL(task.url);
  assert.equal(url.pathname, '/control-org/control-project/_build/results');
  assert.equal(url.searchParams.get('buildId'), '410');
  assert.equal(url.searchParams.get('view'), 'logs');
  assert.equal(url.searchParams.get('j'), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal(url.searchParams.get('t'), 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  assert.equal(evidence.references[0].relativePath, 'log/msnWeatherLifecycle.log');
});

test('text attachment storage failure preserves the original harness error and publishes artifact references without a fake attachment', (t) => {
  const f = reportFixture(t);
  const original = fs.writeFileSync;
  const denied = Object.assign(new Error('cleanup report storage denied'), { code: 'EPERM' });
  fs.writeFileSync = (file, ...args) => {
    if (String(file).endsWith('.cleanup-finalization.txt')) {
      throw denied;
    }
    return original(file, ...args);
  };
  try {
    assert.throws(
      () => writeSingleResult(f.options),
      (error) => {
        assert.match(error.errors[0].message, /unsuccessful-wrapper/);
        assert.equal(error.errors[1], denied);
        return true;
      }
    );
    const result = JSON.parse(fs.readFileSync(path.join(f.root, 'msnWeatherLifecycle.json')));
    assert.deepEqual(result.executedTestCounts, { total: 1, passing: 1, failing: 0, pending: 0 });
    assert.equal(result.failureAttachments.length, 0);
    const xml = fs.readFileSync(path.join(f.root, 'msnWeatherLifecycle.junit.xml'), 'utf8');
    assert.match(xml, /cleanup report storage denied/);
    assert.match(xml, /vscode-e2e-cli-diagnostics-windows-msn-weather-lifecycle\/log\/msnWeatherLifecycle.log/);
    assert.doesNotMatch(xml, /\[\[ATTACHMENT\|/);
  } finally {
    fs.writeFileSync = original;
  }
});

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
      mochaPassingCount: phaseId === 'msnWeatherLifecycle:run' ? 1 : 0,
      ...(phaseId === 'msnWeatherLifecycle:run' ? { bodyAssertionsPassed: true } : {}),
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

test('exact original dependency identities can be closed and admit clean current-invocation evidence', async (t) => {
  const f = fixture(t);
  const observer = { pid: process.pid, parentPid: 1, creationIdentity: '100', executable: process.execPath };
  const dependency = {
    pid: 23,
    parentPid: process.pid,
    creationIdentity: '200',
    executable: path.join(f.dependencyRoot, 'FuncCoreTools', 'in-proc8', 'func.exe'),
  };
  const observations = {
    platform: process.platform,
    queryLocks: () => [],
    snapshot: async () => [observer, dependency],
  };
  await observeMsnCleanupDiagnostics({ ...f, stage: 'before-task-teardown' }, observations);
  await observeMsnCleanupDiagnostics({ ...f, stage: 'after-cli-close' }, observations);
  const snapshots = [[observer, dependency], [observer]];
  const terminated = [];
  const processCleanup = await closeOwnedMsnProcesses(f, {
    snapshot: async () => snapshots.shift() ?? [observer],
    terminate: async (pid) => terminated.push(pid),
    wait: async () => undefined,
    timeoutMs: 100,
  });
  assert.deepEqual(terminated, [dependency.pid]);
  assert.equal(processCleanup.originalProcessClosureVerified, true);
  const journalEnv = beginDirectMsnEvidence(f.env);
  phases({ ...f.env, ...journalEnv });
  fs.rmSync(f.workspaceRoot, { recursive: true, force: false });
  fs.rmSync(f.dependencyRoot, { recursive: true, force: false });
  const terminal = finalizeDirectMsnEvidence(f.env, {
    lifecycleSucceeded: true,
    cleanupVerified: getOwnedRootCleanupVerified([f.workspaceRoot, f.dependencyRoot]),
    phaseResultsPath: journalEnv.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH,
    ownedRoots: [f.workspaceRoot, f.dependencyRoot],
    processCleanup,
  });
  assert.equal(terminal.complete, true);
  assert.equal(terminal.cleanupVerified, true);
  assert.equal(terminal.originalProcessClosureVerified, true);
  assert.equal(terminal.processClosureProof, 'exact-original-identities-absent');
  assert.equal(terminal.exitCode, 0);
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
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
  const result = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    timeout: 30_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.match(result, /interop-declaration-compiled-without-native-invocation/);
});

test('MSN native lifecycle resolves environment values instead of treating variable names as paths or identities', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'test', 'e2e', 'workspaceLifecycle.test.ts'), 'utf8');
  assert.doesNotMatch(source, /requiredValue\('LA_E2E_CLI_(?:MSN_|RUNTIME_DEPENDENCIES_ROOT|WORKSPACE_PARENT)/);
  for (const key of [
    'LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION',
    'LA_E2E_CLI_MSN_DIAGNOSTICS_DIR',
    'LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT',
    'LA_E2E_CLI_WORKSPACE_PARENT',
  ]) {
    assert.match(source, new RegExp(`requiredValue\\(process\\.env\\.${key}\\)`));
  }
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
          closeOwnedProcesses: async () => {
            throw new Error(
              'MSN cleanup blocked: original process identity closure is unverified; exact workspace and dependency roots retained'
            );
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
