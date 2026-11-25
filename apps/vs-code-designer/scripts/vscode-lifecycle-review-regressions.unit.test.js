/* global __dirname, process, require, console, setInterval, clearInterval, setTimeout, clearTimeout */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { once } = require('node:events');
const { createDiagnosticProducer, diagnosticBinding } = require('./e2e-cli-diagnostics');
const {
  currentLogScope,
  loggedResources,
  currentRuntimeProof,
  observeCurrentRuntime,
  observeProcesses,
} = require('./vscode-lifecycle-observer');
const {
  resolveTestUserDataDir,
  prepareLifecycleLaunch,
  assertLaunchProfile,
  bindLifecycleProfile,
  resolveSubsequentStartup,
} = require('./vscode-lifecycle-producer');
const { originalProcessReleased } = require('./vscode-lifecycle-identity');
const { evaluateLifecycleAcceptance } = require('./vscode-lifecycle-acceptance');
const {
  _test: { spawnContainedProcess, sanitizeContainedProcessDiagnostics },
} = require('./run-e2e-cli');

test('CLI config and log collector share short isolated defaults without rewriting explicit profiles', () => {
  const project = path.resolve(__dirname, '..');
  const temporaryDirectory = path.join(os.tmpdir(), 'la-profile-controls');
  const first = resolveTestUserDataDir(project, {}, { temporaryDirectory, pid: 123 });
  const second = resolveTestUserDataDir(project, {}, { temporaryDirectory, pid: 124 });
  assert.equal(path.dirname(first), temporaryDirectory);
  assert.notEqual(first, second);
  assert.notEqual(first, resolveTestUserDataDir(path.join(project, 'other-checkout'), {}, { temporaryDirectory, pid: 123 }));
  const env = { LA_E2E_CLI_USER_DATA_SUFFIX: 'current-owner' };
  const profile = resolveTestUserDataDir(project, env);
  assert.equal(require('./run-e2e-cli')._test.getVscodeUserDataDir(env), profile);
  assert.ok(
    fs
      .readFileSync(path.join(project, '.vscode-test.mjs'), 'utf8')
      .includes('lifecycleProducer.resolveTestUserDataDir(__dirname, process.env)')
  );
  const logger = path.join(
    profile,
    'logs',
    '20261031T214118',
    'window1',
    'exthost',
    'output_logging_20261031T214121',
    '99-Azure Logic Apps (Standard).log'
  );
  if (process.platform === 'win32') assert.ok(logger.length < 260, `Native logger path is too long: ${logger.length}`);
  const explicit = path.join(project, 'explicit-owner-profile');
  assert.equal(resolveTestUserDataDir(project, { ...env, LA_E2E_CLI_USER_DATA_DIR: explicit }), explicit);
  assert.equal(
    resolveTestUserDataDir(project, { ...env, LA_E2E_CLI_USER_DATA_PARENT: explicit }),
    path.join(explicit, 'user-data-current-owner')
  );
});

function nativeRecord(pid, startTimeTicks = '123456789') {
  return {
    pid,
    ...(pid === 802 ? { parentPid: 801 } : {}),
    ...(pid === 801 ? { parentPid: process.pid } : {}),
    startTimeTicks,
    identity:
      process.platform === 'linux'
        ? {
            platform: 'linux',
            kind: 'linux-proc-start',
            startTimeTicks,
            bootId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            clockTicksPerSecond: 100,
          }
        : { platform: 'win32', kind: 'windows-filetime', startTimeTicks },
    metadataStatus: 'captured',
    executablePath: path.join(os.tmpdir(), process.platform === 'win32' ? 'func.exe' : 'func'),
    commandSummary: { sha256: 'a'.repeat(64), ...(process.platform === 'linux' ? { hashEncoding: 'linux-proc-cmdline-nul-bytes' } : {}) },
  };
}

function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'la-review-controls-')));
  const profile = path.join(root, 'profile');
  const workspace = path.join(root, 'current-project');
  fs.mkdirSync(workspace);
  const host = path.join(profile, 'logs', 'current-session', 'window1', 'exthost');
  fs.mkdirSync(path.join(host, 'recorder'), { recursive: true });
  fs.writeFileSync(path.join(host, 'exthost.log'), `[info] Extension host with pid ${process.pid} started.`);
  const log = path.join(host, 'output_logging_current', '1-Azure Logic Apps (Standard).log');
  fs.mkdirSync(path.dirname(log));
  fs.writeFileSync(log, '');
  const launch = prepareLifecycleLaunch(root, {
    LA_E2E_CLI_USER_DATA_DIR: profile,
    LA_E2E_LIFECYCLE_STARTUP_WORKSPACE: workspace,
  });
  fs.writeFileSync(path.join(launch.directory, 'binding.json'), JSON.stringify({ invocation: launch.invocation, rootPid: 10 }));
  const context = { logUri: { scheme: 'file', fsPath: path.join(host, 'recorder') }, subscriptions: [] };
  return { root, profile, workspace, host, log, launch, context, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function productLog(project, port, pid) {
  return [
    `Launching design-time host for project "${project}" from "${path.join(project, 'workflow-designtime')}" on port ${port}.`,
    `Running command: "func host start --port ${port}" with pid: "${pid}"...`,
  ].join('\n');
}

function exceptionFixture(evidence) {
  const installationRoot = path.join(os.tmpdir(), 'synthetic-csharp-review-control');
  const executable = path.join(
    installationRoot,
    '.roslyn',
    `Microsoft.CodeAnalysis.LanguageServer${process.platform === 'win32' ? '.exe' : ''}`
  );
  const survivor = { ...nativeRecord(900), executablePath: executable };
  const proof = (source, observedAt) => ({
    source,
    observedAt,
    invocation: evidence.invocation,
    receipt: `synthetic-${source}`,
    verified: true,
  });
  return {
    mechanism: process.platform === 'linux' ? 'linux-subreaper' : 'windows-job-object',
    rootPid: 10,
    rootExitCode: 0,
    rootSignal: null,
    receiptValidated: true,
    hostOutcomeMatches: true,
    infrastructureCleanupVerified: true,
    forcedTerminationAttempted: true,
    forcedTerminationSucceeded: true,
    postTerminationActiveProcessCount: 0,
    escapedDescendants: [],
    metadataCapturedAtUtc: new Date(3).toISOString(),
    activeContainedProcesses: [survivor],
    activeContainedProcessCount: 1,
    activeContainedProcessesDiagnosticsValid: true,
    activeContainedProcessesTruncated: false,
    lifecycleEvidence: {
      schemaVersion: 1,
      rootPid: 10,
      beforeRecoveryAt: 3,
      ...evidence,
      shutdown: { ...proof('logicapps-owned-shutdown', 1), ownedProcesses: [] },
      resources: { ...evidence.resources, ...proof('logicapps-resource-probe', 2), checked: ['runtime', 'design-time', 'ports', 'locks'] },
      survivorOwners: [
        {
          ...survivor,
          source: 'validated-installed-payload',
          invocation: evidence.invocation,
          receipt: 'synthetic-installed-payload',
          extensionId: 'ms-dotnettools.csharp',
          installationRoot,
          executable,
          commandSha256: survivor.commandSummary.sha256,
          installationSHA256: 'b'.repeat(64),
          payloadSHA256: 'c'.repeat(64),
          processClass: 'csharp-roslyn-language-server',
          productRole: 'independent-dependency',
        },
      ],
    },
  };
}

function scopedNativeReply(directory, responder) {
  // Synthetic protocol owner, never labelled a native product/runtime proof.
  const timer = setInterval(() => {
    for (const entry of fs.readdirSync(directory).filter((file) => file.endsWith('.request'))) {
      const request = path.join(directory, entry);
      const lines = fs.readFileSync(request, 'utf8').split('\n').filter(Boolean);
      const ids = lines.filter((line) => !line.startsWith('port:')).map(Number);
      const ports = lines.filter((line) => line.startsWith('port:')).map((line) => Number(line.slice(5)));
      const reply = {
        observedAtUtc: new Date().toISOString(),
        ownershipComplete: true,
        processes: ids.map((pid) => nativeRecord(pid)),
        ...(ports.length ? { requestedPorts: ports, listeners: [] } : {}),
        ...responder(ids, ports),
      };
      fs.writeFileSync(`${request}.response`, JSON.stringify(reply));
      fs.unlinkSync(request);
    }
  }, 5);
  return () => clearInterval(timer);
}

async function server200() {
  let requests = 0;
  const server = http.createServer((_request, response) => {
    requests++;
    response.writeHead(200);
    response.end('not automatically a current Logic Apps runtime');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, port: server.address().port, requests: () => requests, close: () => new Promise((resolve) => server.close(resolve)) };
}

test('current host scope never scans a historical/foreign workspace HTTP 200 endpoint', async () => {
  const f = fixture();
  const foreign = await server200();
  try {
    const historical = path.join(f.profile, 'logs', 'old-session', 'window1', 'exthost', 'output_logging_old');
    fs.mkdirSync(historical, { recursive: true });
    fs.writeFileSync(
      path.join(historical, '1-Azure Logic Apps (Standard).log'),
      productLog(path.join(f.root, 'old-project'), foreign.port, 800)
    );
    const scope = currentLogScope(f.context, f.launch.environment);
    assert.equal(scope.directory, f.host);
    assert.deepEqual(loggedResources(scope.directory, [f.workspace]).launches, []);
    assert.equal(foreign.requests(), 0, 'Historical port must not even be probed');
    const other = { ...f.launch.environment, LA_E2E_CLI_USER_DATA_DIR: path.join(f.root, 'other-profile') };
    fs.mkdirSync(path.join(other.LA_E2E_CLI_USER_DATA_DIR, 'logs'), { recursive: true });
    assert.throws(() => currentLogScope(f.context, other), /differ from the actual profile/);
    fs.writeFileSync(path.join(f.host, 'exthost.log'), '[info] Extension host with pid 999 started.');
    assert.throws(() => currentLogScope(f.context, f.launch.environment), /PID differs/);
    assert.throws(() => currentLogScope(undefined, f.launch.environment), /log URI unavailable/);
  } finally {
    await foreign.close();
    f.cleanup();
  }
});

test('current logs correlate project, exact port and launcher; outside/current-workspace mismatches have no fallback', () => {
  const f = fixture();
  try {
    fs.writeFileSync(f.log, productLog(f.workspace, 12345, 801));
    const resources = loggedResources(f.host, [f.workspace]);
    assert.equal(resources.launches[0].launcherPid, 801);
    const native = {
      processes: [nativeRecord(801), nativeRecord(process.pid)],
      listeners: [{ port: 12345, pid: 802, matchedRoot: 801, ancestry: [nativeRecord(802), nativeRecord(801)] }],
    };
    assert.equal(currentRuntimeProof(resources, resources.launches[0], native).pid, 802);
    for (const changed of [
      { listeners: undefined },
      { listeners: [] },
      { listeners: [{ ...native.listeners[0], matchedRoot: null, ancestry: [] }] },
      { listeners: [{ ...native.listeners[0], matchedRoot: 900 }] },
      { listeners: [{ ...native.listeners[0], ancestry: [{ ...nativeRecord(802), metadataStatus: 'not-in-job' }, nativeRecord(801)] }] },
      { listeners: [{ ...native.listeners[0], ancestry: [nativeRecord(802), nativeRecord(801, '999')] }] },
      { listeners: [...native.listeners, ...native.listeners] },
      { processes: [nativeRecord(801)] },
      { processes: [{ ...nativeRecord(801), parentPid: 900 }, nativeRecord(process.pid)] },
      { processes: [nativeRecord(801), nativeRecord(process.pid, '999999999')] },
      { listeners: [{ ...native.listeners[0], ancestry: [{ ...nativeRecord(802), parentPid: 900 }, nativeRecord(801)] }] },
      {
        listeners: [
          {
            ...native.listeners[0],
            ancestry: [{ ...nativeRecord(802), executablePath: path.join(f.root, 'node.exe') }, nativeRecord(801)],
          },
        ],
      },
    ]) {
      assert.throws(() => currentRuntimeProof(resources, resources.launches[0], { ...native, ...changed }));
    }
    fs.writeFileSync(f.log, productLog(path.join(f.root, 'foreign-project'), 12345, 801));
    assert.throws(() => loggedResources(f.host, [f.workspace]), /outside the current workspace/);
    fs.writeFileSync(f.log, 'Running command: "func host start --port 12345" with pid: "801"...');
    assert.throws(() => loggedResources(f.host, [f.workspace]), /lacks its project/);
  } finally {
    f.cleanup();
  }
});

test('foreign HTTP 200 is rejected; synthetic current positive requires native identity before AND after response', async () => {
  const f = fixture();
  const endpoint = await server200();
  let reply = () => ({});
  const stop = scopedNativeReply(f.launch.directory, (ids, ports) => reply(ids, ports));
  try {
    fs.writeFileSync(f.log, productLog(f.workspace, endpoint.port, 801));
    const resources = loggedResources(f.host, [f.workspace]);
    const launch = resources.launches[0];
    // Foreign server is real; the refusal is the synthetic native protocol.
    await assert.rejects(observeCurrentRuntime(f.launch.directory, resources, launch), /listener unavailable/);
    assert.equal(endpoint.requests(), 0);
    reply = (_ids, ports) => ({
      listeners: ports.map((port) => ({ port, pid: 802, matchedRoot: 801, ancestry: [nativeRecord(802), nativeRecord(801)] })),
    });
    const runtime = await observeCurrentRuntime(f.launch.directory, resources, launch);
    assert.equal(runtime.health.statusCode, 200);
    assert.equal(runtime.runtimePid, 802);
    assert.notEqual(runtime.before.receipt, runtime.after.receipt);
    const observerFile = path.join(f.launch.directory, 'synthetic-current.observer.jsonl');
    const identity = await observeProcesses(f.launch.directory, [process.pid]);
    const producerBindingReceipt = path.join(f.launch.directory, 'producer-binding.json');
    const startup = {
      schemaVersion: 1,
      ...JSON.parse(fs.readFileSync(path.join(f.launch.directory, 'binding.json'))),
      kind: 'startup',
      source: 'logicapps-subsequent-startup',
      domain: 'design-time',
      verified: true,
      receipt: observerFile,
      launchId: `${f.launch.invocation}:${process.pid}:${runtime.launch.port}`,
      extensionHostPid: process.pid,
      nativeIdentity: identity,
      logScope: currentLogScope(f.context, f.launch.environment),
      producerBinding: JSON.parse(fs.readFileSync(producerBindingReceipt)),
      producerBindingReceipt,
      runtime,
      health: runtime.health,
      observedAt: Date.now(),
    };
    fs.writeFileSync(observerFile, `${JSON.stringify(startup)}\n`);
    const link = path.join(f.root, 'synthetic-next.json');
    fs.writeFileSync(link, JSON.stringify({ directory: f.launch.directory, invocation: f.launch.invocation }));
    const evidence = {
      invocation: 'previous-invocation',
      nextStartupLink: link,
      requiredStartupDomain: 'design-time',
      resources: { workspaceResources: [f.workspace] },
    };
    const resolved = resolveSubsequentStartup(evidence);
    assert.ok(resolved.startup, 'Producer must admit a complete current synthetic proof');
    for (const domain of ['extension-host', 'design-time']) {
      const current = { ...startup, domain };
      fs.writeFileSync(observerFile, `${JSON.stringify(current)}\n`);
      const linkedEvidence = { ...evidence, requiredStartupDomain: domain };
      const admitted = resolveSubsequentStartup(linkedEvidence);
      assert.equal(admitted.startupResolutionError, undefined);
      for (const candidate of [linkedEvidence, admitted]) {
        const closure = exceptionFixture(candidate);
        assert.equal(evaluateLifecycleAcceptance(closure, closure.lifecycleEvidence).accepted, true, `${domain} current positive`);
      }
      const mutations = [
        { nativeIdentity: { ...identity, ownershipComplete: false } },
        { nativeIdentity: { ...identity, processes: [] } },
        { nativeIdentity: { ...identity, processes: [{ ...identity.processes[0], metadataStatus: 'inspection-failed' }] } },
        { nativeIdentity: { ...identity, processes: [{ ...identity.processes[0], commandSummary: { sha256: '' } }] } },
        { actualInvocation: evidence.invocation },
        {
          logScope: { ...startup.logScope, directory: path.join(f.root, 'foreign-profile', 'logs', 'session', 'window1', 'exthost') },
        },
        { logScope: { ...startup.logScope, directory: path.join(f.profile, 'logs', 'old-session', 'window1', 'exthost') } },
        { logScope: { ...startup.logScope, directory: path.join(f.profile, 'logs', 'current-session', 'window1') } },
        { logScope: { ...startup.logScope, hostLog: path.join(f.root, 'foreign-exthost.log') } },
        { logScope: { ...startup.logScope, extensionHostPid: 999 } },
        ...(domain === 'design-time'
          ? [{ runtime: { ...runtime, launch: { ...runtime.launch, receipt: path.join(f.root, 'foreign-product.log') } } }]
          : []),
      ];
      for (const mutation of mutations) {
        for (const embedded of [false, true]) {
          fs.writeFileSync(observerFile, `${JSON.stringify({ ...current, ...mutation })}\n`);
          const candidate = embedded ? { ...admitted, startup: { ...admitted.startup, ...mutation } } : linkedEvidence;
          assert.ok(resolveSubsequentStartup(candidate).startupResolutionError, `${domain} ${embedded ? 'embedded' : 'linked'} negative`);
          const closure = exceptionFixture(candidate);
          const verdict = evaluateLifecycleAcceptance(closure, closure.lifecycleEvidence);
          assert.equal(verdict.accepted, false);
          assert.equal(verdict.reason, 'subsequent-startup-verification-failed');
        }
      }
    }
    fs.writeFileSync(observerFile, `${JSON.stringify(startup)}\n`);
    // Embedded admission must remain structural: no historical/native files need reopening.
    fs.renameSync(f.launch.directory, `${f.launch.directory}.offline`);
    fs.renameSync(path.join(f.profile, 'logs'), path.join(f.profile, 'logs.offline'));
    try {
      const closure = exceptionFixture(resolved);
      assert.equal(evaluateLifecycleAcceptance(closure, closure.lifecycleEvidence).accepted, true);
    } finally {
      fs.renameSync(`${f.launch.directory}.offline`, f.launch.directory);
      fs.renameSync(path.join(f.profile, 'logs.offline'), path.join(f.profile, 'logs'));
    }
    assert.equal(resolveSubsequentStartup(resolved).startupResolutionError, undefined, 'Complete embedded startup remains durable');
    assert.ok(
      resolveSubsequentStartup({ ...resolved, startup: { ...resolved.startup, runtime: undefined } }).startupResolutionError,
      'An embedded historical HTTP-only success must not bypass current runtime proof'
    );
    for (const mutation of [
      { runtime: undefined },
      { producerBinding: { ...startup.producerBinding, requiredWorkspace: path.join(f.root, 'old-workspace') } },
      { logScope: { ...startup.logScope, directory: path.join(f.profile, 'logs', 'old-session') } },
      { runtime: { ...runtime, after: { ...runtime.after, listeners: [] } } },
    ]) {
      fs.writeFileSync(observerFile, `${JSON.stringify({ ...startup, ...mutation })}\n`);
      assert.ok(resolveSubsequentStartup(evidence).startupResolutionError, 'HTTP 200 must not bypass current native/product bindings');
    }
    let calls = 0;
    reply = (_ids, ports) => ({
      listeners: ports.map((port) => ({
        port,
        pid: 802,
        matchedRoot: 801,
        ancestry: [nativeRecord(802, ++calls === 1 ? '123' : '999'), nativeRecord(801)],
      })),
    });
    await assert.rejects(observeCurrentRuntime(f.launch.directory, resources, launch), /changed around/);
  } finally {
    stop();
    await endpoint.close();
    f.cleanup();
  }
});

test('shared profile launch controls bind actual argv, native invocation and observer profile; stale/missing/duplicate profiles fail', () => {
  const f = fixture();
  try {
    for (const args of [[`--user-data-dir=${f.profile}`], ['--user-data-dir', f.profile]]) {
      const bound = bindLifecycleProfile(f.launch.environment, args);
      const receipt = JSON.parse(fs.readFileSync(bound.LA_E2E_LIFECYCLE_PRODUCER_BINDING));
      assert.equal(receipt.profile, f.profile);
      assert.equal(receipt.invocation, f.launch.invocation);
    }
    assert.throws(() => assertLaunchProfile({}, [`--user-data-dir=${f.profile}`]), /profile is missing/);
    assert.throws(() => assertLaunchProfile(f.launch.environment, [`--user-data-dir=${path.join(f.root, 'foreign')}`]), /profiles differ/);
    assert.throws(
      () => assertLaunchProfile(f.launch.environment, [`--user-data-dir=${f.profile}`, '--user-data-dir', f.profile]),
      /ambiguous/
    );
    assert.throws(() =>
      bindLifecycleProfile({ ...f.launch.environment, LA_E2E_LIFECYCLE_INVOCATION: 'foreign' }, [`--user-data-dir=${f.profile}`])
    );
    assert.throws(() => spawnContainedProcess(process.execPath, [`--user-data-dir=${f.profile}`], { env: {} }), /profile is missing/);
  } finally {
    f.cleanup();
  }
});

test('retained-handle exit proof requires matching creation and kernel exit; live inaccessible/outside metadata never proves release', () => {
  const original = { pid: 123, startTimeTicks: '100', identity: { platform: 'win32', kind: 'windows-filetime', startTimeTicks: '100' } };
  const exited = { ...original, metadataStatus: 'exited', exitProof: { source: 'GetProcessTimes', exitTimeTicks: '200' } };
  assert.equal(originalProcessReleased(original, exited), true);
  for (const mutation of [
    { metadataStatus: 'inspection-failed' },
    { metadataStatus: 'not-in-job' },
    { metadataStatus: 'membership-query-failed' },
    { startTimeTicks: '999' },
    { exitProof: undefined },
    { exitProof: { source: 'unknown', exitTimeTicks: '200' } },
    { exitProof: { source: 'GetProcessTimes', exitTimeTicks: '0' } },
  ]) {
    assert.equal(originalProcessReleased(original, { ...exited, ...mutation }), false);
    if (mutation.metadataStatus === undefined) {
      assert.equal(sanitizeContainedProcessDiagnostics([{ ...exited, ...mutation }], {}, 'win32').valid, false);
    }
  }
  assert.equal(sanitizeContainedProcessDiagnostics([exited], {}, 'win32').valid, true);
});

function recorderHarness(f, install) {
  const intervals = new Map();
  let timerId = 0;
  const disposable = () => ({ dispose() {} });
  const api = { tasks: new Proxy({}, { get: () => disposable }), commands: { registerCommand: disposable } };
  const module = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../src/test/ui/codefulTaskRecorderExtension/main.js'), 'utf8'),
    {
      module,
      require: (id) => (id === 'vscode' ? api : id === './vscode-lifecycle-observer' ? { installLifecycleObserver: install } : require(id)),
      process: {
        env: {
          ...f.launch.environment,
          LA_E2E_TRIGGER_DIR: path.join(f.root, 'triggers'),
          LA_E2E_TASK_EVENTS_JSONL: path.join(f.root, 'events.jsonl'),
        },
      },
      console: { log() {}, error() {} },
      setInterval: (callback, ms) => {
        const id = ++timerId;
        intervals.set(id, { callback, ms });
        return id;
      },
      clearInterval: (id) => intervals.delete(id),
      setTimeout,
      clearTimeout,
    },
    { filename: 'actual-codeful-recorder-main.js' }
  );
  module.exports.activate(f.context);
  const trigger = () => {
    fs.writeFileSync(path.join(f.launch.directory, 'shutdown.trigger'), '');
    const timer = [...intervals.values()].find((entry) => entry.ms === 100);
    assert.ok(timer);
    timer.callback();
  };
  return { exports: module.exports, trigger, intervals };
}

function observerHarness(f, deactivate, appendFileSync, controls = {}) {
  const intervals = new Map();
  let timerId = 0;
  let taskStarted;
  const module = { exports: {} };
  const main = path.join(f.root, 'product-main.js');
  const loaded = { loaded: true, exports: { deactivate } };
  const debugEvents = new Map();
  const api = {
    tasks: {
      onDidStartTaskProcess: (callback) => {
        taskStarted = callback;
        return { dispose() {} };
      },
      taskExecutions: [],
    },
    debug: {
      onDidStartDebugSession: (callback) => {
        debugEvents.set('start', callback);
        return { dispose: () => debugEvents.delete('start') };
      },
      onDidTerminateDebugSession: (callback) => {
        debugEvents.set('terminate', callback);
        return { dispose: () => debugEvents.delete('terminate') };
      },
    },
    extensions: { getExtension: () => ({ activate: async () => {}, extensionPath: f.root, packageJSON: { main: 'product-main.js' } }) },
    workspace: { workspaceFolders: [{ uri: { fsPath: f.workspace } }] },
    version: 'synthetic-vscode-api',
  };
  // Local VM dependency only; never patch the process-global fs module.
  const loadedRequire = (id) => (id === 'node:fs' ? { ...fs, ...controls.fs, ...(appendFileSync ? { appendFileSync } : {}) } : require(id));
  loadedRequire.resolve = () => main;
  loadedRequire.cache = { [main]: loaded };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, 'vscode-lifecycle-observer.js'), 'utf8'),
    {
      module,
      require: loadedRequire,
      process: { env: f.launch.environment, pid: process.pid, platform: process.platform },
      setInterval: (callback) => {
        const id = ++timerId;
        intervals.set(id, callback);
        return id;
      },
      clearInterval: (id) => intervals.delete(id),
      setTimeout: controls.setTimeout ?? setTimeout,
      ...(controls.Date ? { Date: controls.Date } : {}),
    },
    { filename: 'actual-lifecycle-observer.js' }
  );
  return {
    install: () => module.exports.installLifecycleObserver(api, f.launch.environment, f.context),
    intervals,
    debugEvents,
    startTask: (pid) =>
      taskStarted({ processId: pid, execution: { task: { name: 'func: host start', scope: { uri: { fsPath: f.workspace } } } } }),
  };
}

function shutdownBudgetControl(f, { msn, releaseAt, telemetryFailure = false, primary }) {
  let now = 0;
  let productCalls = 0;
  let supplementalReads = 0;
  let telemetryFailures = 0;
  const releases = [];
  const order = [];
  const dependencyRoot = path.join(f.root, 'dependencies');
  const diagnostics = path.join(f.root, 'msn-diagnostics');
  fs.mkdirSync(dependencyRoot);
  fs.mkdirSync(diagnostics);
  if (msn) {
    Object.assign(f.launch.environment, {
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'msn-weather-run',
      LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: dependencyRoot,
      LA_E2E_CLI_MSN_DIAGNOSTICS_DIR: diagnostics,
    });
    for (const stage of ['before-task-teardown', 'after-task-teardown']) {
      fs.writeFileSync(
        path.join(diagnostics, `${stage}.json`),
        JSON.stringify({
          schemaVersion: 1,
          stage,
          processObservationAvailable: true,
          observerPid: process.pid,
          observerIdentities: [{ pid: process.pid }],
          dependencyRoot,
          observedAt: new Date(0).toISOString(),
          dependencyCandidateAncestry: [
            { pid: 901, parentPid: 902, creationIdentity: 'synthetic-msn-birth', executable: path.join(dependencyRoot, 'func') },
          ],
        })
      );
    }
  }
  const harness = observerHarness(
    f,
    async () => {
      productCalls++;
      order.push({ event: 'product', at: now });
      if (primary) throw primary;
    },
    (file, line, ...args) => {
      const record = JSON.parse(line);
      if (record.kind === 'error' || record.kind === 'shutdown') order.push({ event: record.kind, at: now });
      if (telemetryFailure && record.operation && (supplementalReads === 2 || (primary && productCalls))) {
        telemetryFailures++;
        throw new Error('secondary diagnostic sink unavailable');
      }
      return fs.appendFileSync(file, line, ...args);
    },
    {
      // Only this VM's clock/timers/fs are replaced. Execute the complete
      // original observer and identity checks, not an extracted/rewritten loop.
      Date: class extends Date {
        static now() {
          return now;
        }
      },
      setTimeout: (callback, ms) => {
        assert.equal(ms, 50, 'Only the existing polling interval may advance the virtual clock');
        now += ms;
        callback();
      },
      fs: {
        renameSync: (from, to) => {
          fs.renameSync(from, to);
          if (!to.endsWith('.request')) return;
          const lines = fs.readFileSync(to, 'utf8').split('\n').filter(Boolean);
          const pids = lines.filter((line) => !line.startsWith('port:')).map(Number);
          const ports = lines.filter((line) => line.startsWith('port:')).map((line) => Number(line.slice(5)));
          if (ports.length) {
            assert.deepEqual(ports, [7071]);
            assert.deepEqual(pids, [901, 902], 'Supplemental population must not change the authoritative owned set');
            supplementalReads++;
            order.push({ event: `stage-${supplementalReads}`, at: now });
            if (supplementalReads === 2) now += 4_000;
          } else if (productCalls && pids.includes(801)) {
            assert.deepEqual(pids, [801]);
            releases.push(now);
          }
          fs.writeFileSync(
            `${to}.response`,
            JSON.stringify({
              observedAtUtc: new Date(now).toISOString(),
              ownershipComplete: true,
              processes: pids.map((pid) => ({
                ...nativeRecord(pid),
                ...(pid === 801 && productCalls && now >= releaseAt
                  ? { metadataStatus: 'exited', exitProof: { source: 'GetProcessTimes', exitTimeTicks: '123456790' } }
                  : {}),
              })),
              ...(ports.length ? { requestedPorts: ports, listeners: [] } : {}),
            })
          );
          fs.unlinkSync(to);
        },
      },
    }
  );
  return {
    harness,
    releases,
    order,
    snapshot: () => ({ now, productCalls, supplementalReads, telemetryFailures }),
  };
}

test('stage-2 MSN probe cannot extend the original release budget or rescue a late original identity', async () => {
  for (const msn of [false, true]) {
    const f = fixture();
    const control = shutdownBudgetControl(f, { msn, releaseAt: 12_000 });
    let observer;
    try {
      observer = await control.harness.install();
      control.harness.startTask(801);
      // Observation-only failure keeps ordinary closure non-gating; its error
      // receipt, not a new rejected promise, is the authoritative failed verdict.
      await observer.shutdown();
      await observer.shutdown();
      assert.equal(control.releases[0], 0);
      assert.equal(control.releases.at(-1), 10_000);
      assert.equal(control.releases.length, 201);
      assert.deepEqual(control.snapshot(), {
        now: msn ? 14_000 : 10_000,
        productCalls: 1,
        supplementalReads: msn ? 2 : 0,
        telemetryFailures: 0,
      });
      const rows = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
      assert.ok(rows.some((row) => row.operation === 'scoped-original-process-release' && row.status === 'failure'));
      assert.ok(rows.some((row) => row.kind === 'error' && row.reason === 'deactivation-or-original-resource-release-failed'));
      assert.ok(!rows.some((row) => row.kind === 'shutdown'), 'A process exiting at 12s must not be rescued by the 4s stage-2 read');
      if (msn) {
        assert.deepEqual(control.order, [
          { event: 'stage-1', at: 0 },
          { event: 'product', at: 0 },
          { event: 'error', at: 10_000 },
          { event: 'stage-2', at: 10_000 },
        ]);
      }
    } finally {
      observer?.dispose();
      f.cleanup();
    }
  }
});

test('stage-2 telemetry failure preserves the fixed success or original identity-release failure', async () => {
  for (const releaseAt of [5_000, 12_000]) {
    const f = fixture();
    const control = shutdownBudgetControl(f, { msn: true, releaseAt, telemetryFailure: true });
    let observer;
    try {
      observer = await control.harness.install();
      control.harness.startTask(801);
      await observer.shutdown();
      const verdictAt = Math.min(releaseAt, 10_000);
      assert.equal(control.releases.at(-1), verdictAt);
      assert.equal(control.snapshot().now, verdictAt + 4_000);
      assert.equal(control.snapshot().productCalls, 1);
      assert.equal(control.snapshot().supplementalReads, 2);
      assert.ok(control.snapshot().telemetryFailures > 0, 'Secondary sink failure must actually execute');
      assert.deepEqual(control.order.slice(-2), [
        { event: releaseAt === 5_000 ? 'shutdown' : 'error', at: verdictAt },
        { event: 'stage-2', at: verdictAt },
      ]);
      const rows = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(rows.filter((row) => row.kind === 'shutdown').length, releaseAt === 5_000 ? 1 : 0);
      assert.equal(rows.filter((row) => row.kind === 'error').length, releaseAt === 5_000 ? 0 : 1);
      if (releaseAt === 5_000) {
        assert.deepEqual(
          rows.find((row) => row.kind === 'shutdown').shutdown.ownedProcesses.map(({ pid }) => pid),
          [801]
        );
      }
    } finally {
      observer?.dispose();
      f.cleanup();
    }
  }
});

test('MSN telemetry failure cannot replace the original product rejection or start stage-2 observation', async () => {
  const f = fixture();
  const primary = new assert.AssertionError({ message: 'original product shutdown assertion' });
  const control = shutdownBudgetControl(f, { msn: true, releaseAt: 12_000, telemetryFailure: true, primary });
  let observer;
  try {
    observer = await control.harness.install();
    control.harness.startTask(801);
    await assert.rejects(observer.shutdown(), (error) => error === primary);
    await assert.rejects(observer.shutdown(), (error) => error === primary);
    assert.equal(control.snapshot().now, 0);
    assert.equal(control.snapshot().productCalls, 1);
    assert.equal(control.snapshot().supplementalReads, 1);
    assert.ok(control.snapshot().telemetryFailures > 0);
    assert.deepEqual(control.releases, []);
    const rows = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(rows.some((row) => row.kind === 'error' && row.productDeactivationFailed === true));
    assert.ok(!rows.some((row) => row.kind === 'shutdown'));
  } finally {
    observer?.dispose();
    f.cleanup();
  }
});

test('MSN actual observer records hashed exact debug identity and preserves product failure when populations are missing', async () => {
  const f = fixture();
  f.launch.environment.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE = 'msn-weather-run';
  f.launch.environment.LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION = 'synthetic-msn-invocation';
  const stop = scopedNativeReply(f.launch.directory, () => ({}));
  const primary = new Error('original MSN deactivation failure');
  const harness = observerHarness(f, async () => {
    throw primary;
  });
  let observer;
  try {
    observer = await harness.install();
    const session = {
      id: 'exact-msn-session-control',
      type: 'coreclr',
      workspaceFolder: { uri: { fsPath: f.workspace } },
      configuration: { __logicAppsMsnInvocation: 'synthetic-msn-invocation', secret: 'must-not-copy-configuration' },
    };
    harness.debugEvents.get('start')(session);
    harness.debugEvents.get('terminate')(session);
    await assert.rejects(observer.shutdown(), (error) => error === primary);
    const rows = fs
      .readFileSync(observer.receipt, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const events = rows.filter((row) => row.operation === 'msn-debug-stop');
    assert.deepEqual(
      events.map((row) => row.status),
      ['observer-installed', 'session-started', 'session-terminated']
    );
    assert.equal(events[1].state.selected.sha256, events[2].state.selected.sha256);
    assert.equal(events[1].state.matches, true);
    assert.equal(events[1].state.owned, true);
    assert.ok(!JSON.stringify(rows).includes(session.id));
    assert.ok(!JSON.stringify(rows).includes('must-not-copy-configuration'));
    assert.ok(
      rows.some((row) => row.status === 'sample-unavailable'),
      'Missing population is explicit, never a successful empty sample'
    );
    assert.ok(rows.some((row) => row.operation === 'original-product-deactivate' && row.status === 'failure'));
    assert.ok(!rows.some((row) => row.kind === 'shutdown'));
  } finally {
    observer?.dispose();
    assert.equal(harness.debugEvents.size, 0);
    stop();
    f.cleanup();
  }
});

function cliRecorderHarness(f, install) {
  const exports = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, 'fixtures/lifecycle-recorder/extension.js'), 'utf8'),
    {
      exports,
      require: (id) =>
        id === 'vscode' ? {} : id === '../../vscode-lifecycle-observer' ? { installLifecycleObserver: install } : require(id),
      process: { env: f.launch.environment },
      console: { error() {} },
    },
    { filename: 'actual-cli-lifecycle-recorder.js' }
  );
  return exports;
}

test('original product assertion survives both observer telemetry and legacy error append failure', async () => {
  const f = fixture();
  const stop = scopedNativeReply(f.launch.directory, () => ({}));
  const primary = new assert.AssertionError({ message: 'actual product primary assertion' });
  let failLogs = false;
  const harness = observerHarness(
    f,
    async () => {
      throw primary;
    },
    (...args) => {
      if (failLogs) throw new Error('secondary append unavailable');
      return fs.appendFileSync(...args);
    }
  );
  let observer;
  try {
    observer = await harness.install();
    failLogs = true;
    await assert.rejects(observer.shutdown(), (error) => error === primary);
  } finally {
    observer?.dispose();
    await stop();
    f.cleanup();
  }
});

test('CLI recorder real reload hook awaits pending observer installation and original shutdown under its original profile', async () => {
  const f = fixture();
  const stop = scopedNativeReply(f.launch.directory, () => ({}));
  let installFinished;
  let releaseProduct;
  let productStarted;
  const started = new Promise((resolve) => {
    productStarted = resolve;
  });
  let calls = 0;
  let observer;
  let disposals = 0;
  const harness = observerHarness(f, () => {
    calls++;
    productStarted();
    return new Promise((resolve) => {
      releaseProduct = resolve;
    });
  });
  const recorder = cliRecorderHarness(f, (api, env, context) => {
    assert.equal(env.LA_E2E_CLI_USER_DATA_DIR, f.profile);
    assert.equal(context, f.context);
    return new Promise((resolve) => {
      installFinished = async () => {
        observer = await harness.install();
        resolve({
          shutdown: observer.shutdown,
          dispose: () => {
            disposals++;
            observer.dispose();
          },
        });
      };
    });
  });
  try {
    const activated = recorder.activate(f.context);
    assert.equal(activated.then, undefined, 'VS Code must register deactivate before the asynchronous observation completes');
    const reload = recorder.deactivate();
    const teardown = activated.shutdown();
    assert.equal(reload, teardown, 'Reload and last teardown share the same awaited hook');
    assert.equal(calls, 0);
    await installFinished();
    await started;
    assert.equal(calls, 1);
    assert.equal(disposals, 0);
    let records = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(records.filter((record) => record.kind === 'startup').length, 1);
    assert.equal(records.filter((record) => record.kind === 'shutdown').length, 0, 'Pending product export is not shutdown proof');
    releaseProduct();
    await Promise.all([reload, teardown]);
    await recorder.deactivate();
    assert.equal(calls, 1);
    assert.equal(disposals, 1);
    records = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
    const startup = records.find((record) => record.kind === 'startup');
    const shutdown = records.find((record) => record.kind === 'shutdown');
    assert.equal(records.filter((record) => record.kind === 'shutdown').length, 1);
    assert.equal(shutdown.extensionHostPid, startup.extensionHostPid);
    assert.deepEqual(shutdown.nativeIdentity, startup.nativeIdentity);
    assert.ok(shutdown.shutdown.observedAt >= startup.observedAt);
  } finally {
    observer?.dispose();
    stop();
    f.cleanup();
  }
});

test('CLI recorder installation and original product failures reject real teardown without retrying or manufacturing proof', async () => {
  for (const failure of ['installation', 'product']) {
    const f = fixture();
    let calls = 0;
    let disposals = 0;
    const recorder = cliRecorderHarness(f, async () => {
      if (failure === 'installation') throw new Error('observer unavailable');
      return {
        shutdown: async () => {
          calls++;
          throw new Error('original product failed');
        },
        dispose: () => {
          disposals++;
        },
      };
    });
    try {
      recorder.activate(f.context);
      const shutdown = recorder.deactivate();
      assert.equal(shutdown, recorder.deactivate());
      await assert.rejects(shutdown, failure === 'installation' ? /observer unavailable/ : /original product failed/);
      await assert.rejects(recorder.deactivate());
      assert.equal(calls, failure === 'installation' ? 0 : 1);
      assert.equal(disposals, failure === 'installation' ? 0 : 1);
    } finally {
      f.cleanup();
    }
  }
});

test('actual observer with admitted current host never verifies historical/foreign HTTP 200 startup', async () => {
  const f = fixture();
  const endpoint = await server200();
  const stop = scopedNativeReply(f.launch.directory, () => ({}));
  try {
    const historical = path.join(f.profile, 'logs', 'old-session', 'window1', 'exthost', 'output_logging_old');
    fs.mkdirSync(historical, { recursive: true });
    fs.writeFileSync(
      path.join(historical, '1-Azure Logic Apps (Standard).log'),
      productLog(path.join(f.root, 'old-project'), endpoint.port, 800)
    );
    const harness = observerHarness(f, async () => {});
    const observer = await harness.install();
    const poll = [...harness.intervals.values()][0];
    await poll();
    let records = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(records.some((record) => record.kind === 'startup' && record.domain === 'extension-host' && record.verified));
    assert.ok(records.some((record) => record.kind === 'startup-error' && /log binding unavailable/.test(record.reason)));
    assert.ok(!records.some((record) => record.domain === 'design-time' && record.verified));
    fs.writeFileSync(f.log, productLog(f.workspace, endpoint.port, 801));
    await poll();
    records = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(!records.some((record) => record.domain === 'design-time' && record.verified));
    assert.equal(endpoint.requests(), 0, 'Current native extension-host PID is not current runtime listener proof');
    observer.dispose();
  } finally {
    stop();
    await endpoint.close();
    f.cleanup();
  }
});

test('missing real product logger never becomes empty-resource proof, even after actual deactivation', async () => {
  const f = fixture();
  const stop = scopedNativeReply(f.launch.directory, () => ({}));
  let deactivations = 0;
  try {
    fs.unlinkSync(f.log);
    const harness = observerHarness(f, async () => {
      deactivations++;
    });
    const observer = await harness.install();
    await [...harness.intervals.values()][0]();
    await observer.shutdown();
    await observer.shutdown();
    const records = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(deactivations, 1);
    assert.ok(
      records.some((record) => record.kind === 'error' && /Original native Logic Apps logger receipt unavailable/.test(record.reason))
    );
    assert.equal(records.filter((record) => record.kind === 'shutdown').length, 0);
    observer.dispose();
  } finally {
    stop();
    f.cleanup();
  }
});

test('actual observer never verifies startup after native host identity admission fails', async () => {
  const f = fixture();
  let deactivations = 0;
  const stop = scopedNativeReply(f.launch.directory, (ids) => ({
    processes: ids.map((pid) => ({ pid, metadataStatus: 'inspection-failed' })),
  }));
  try {
    const harness = observerHarness(f, async () => {
      deactivations++;
    });
    const observer = await harness.install();
    await [...harness.intervals.values()][0]();
    const records = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(records.some((record) => record.kind === 'error' && /native-startup-observation-failed/.test(record.reason)));
    assert.ok(!records.some((record) => record.kind === 'startup' && record.verified));
    await observer.shutdown();
    assert.equal(deactivations, 1, 'Observation unavailability must not skip actual product deactivation');
    observer.dispose();
  } finally {
    stop();
    f.cleanup();
  }
});

test('actual observer serializes concurrent and repeated shutdown into one original product call, including observation failure', async () => {
  for (const captureFailure of [false, true]) {
    const f = fixture();
    const stop = scopedNativeReply(f.launch.directory, () => ({}));
    let calls = 0;
    let release;
    let shutdownStarted;
    const started = new Promise((resolve) => {
      shutdownStarted = resolve;
    });
    const harness = observerHarness(f, () => {
      calls++;
      shutdownStarted();
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    try {
      const observer = await harness.install();
      if (captureFailure) fs.writeFileSync(path.join(f.host, 'exthost.log'), 'current host metadata unavailable');
      const first = observer.shutdown();
      const second = observer.shutdown();
      await started;
      assert.equal(calls, 1);
      release();
      await Promise.all([first, second]);
      await observer.shutdown();
      assert.equal(calls, 1);
      const records = fs.readFileSync(observer.receipt, 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(records.filter((record) => record.kind === 'shutdown').length, captureFailure ? 0 : 1);
      if (captureFailure) assert.ok(records.some((record) => record.kind === 'error'));
      observer.dispose();
    } finally {
      stop();
      f.cleanup();
    }
  }
});

test('actual recorder exported deactivate awaits pending observer on reload and disposes exactly once', async () => {
  const f = fixture();
  let installed;
  let release;
  let shutdowns = 0;
  let disposals = 0;
  let shutdownStarted;
  const started = new Promise((resolve) => {
    shutdownStarted = resolve;
  });
  const harness = recorderHarness(
    f,
    () =>
      new Promise((resolve) => {
        installed = resolve;
      })
  );
  try {
    const first = harness.exports.deactivate();
    const second = harness.exports.deactivate();
    assert.equal(first, second);
    installed({
      shutdown: () => {
        shutdowns++;
        shutdownStarted();
        return new Promise((resolve) => {
          release = resolve;
        });
      },
      dispose: () => {
        disposals++;
      },
    });
    await started;
    assert.equal(shutdowns, 1);
    assert.equal(disposals, 0);
    release();
    await first;
    await harness.exports.deactivate();
    assert.equal(shutdowns, 1);
    assert.equal(disposals, 1);
    assert.ok(![...harness.intervals.values()].some((entry) => entry.ms === 100));
  } finally {
    f.cleanup();
  }
});

test('actual recorder file-trigger/exported-deactivate race has one actual shutdown and propagates product failure', async () => {
  for (const failed of [false, true]) {
    const f = fixture();
    let release;
    let shutdowns = 0;
    let disposals = 0;
    let shutdownStarted;
    const started = new Promise((resolve) => {
      shutdownStarted = resolve;
    });
    const shutdown = new Promise((resolve, reject) => {
      release = () => (failed ? reject(new Error('actual-product-failure')) : resolve());
    });
    const harness = recorderHarness(f, async () => ({
      shutdown: () => {
        shutdowns++;
        shutdownStarted();
        return shutdown;
      },
      dispose: () => {
        disposals++;
      },
    }));
    try {
      harness.trigger();
      const deactivation = harness.exports.deactivate();
      await started;
      assert.equal(shutdowns, 1);
      assert.equal(disposals, 0);
      release();
      if (failed) await assert.rejects(deactivation, /actual-product-failure/);
      else await deactivation;
      assert.equal(disposals, 1);
      if (failed) await assert.rejects(harness.exports.deactivate(), /actual-product-failure/);
      else await harness.exports.deactivate();
      assert.equal(shutdowns, 1);
    } finally {
      f.cleanup();
    }
  }
});

function readLines(stream) {
  let text = '';
  const lines = [];
  const waiting = [];
  stream.on('data', (chunk) => {
    text += chunk;
    while (text.includes('\n')) {
      const index = text.indexOf('\n');
      const line = text.slice(0, index).trim();
      text = text.slice(index + 1);
      if (!line) continue;
      if (waiting.length) waiting.shift()(line);
      else lines.push(line);
    }
  });
  return async () => {
    if (lines.length) return JSON.parse(lines.shift());
    let timer;
    try {
      return JSON.parse(
        await Promise.race([
          new Promise((resolve) => waiting.push(resolve)),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Native control output unavailable')), 15_000);
          }),
        ])
      );
    } finally {
      clearTimeout(timer);
    }
  };
}

const previousRetainedHandleNodeScript = "process.stdin.once('data',()=>process.exit(0));process.stdin.resume();";
// The invocation's marker, not the lifetime of an input pipe, owns this child.
// The referenced timer survives stdin EOF and is closed only on explicit release.
const retainedHandleNodeScript = [
  "const fs=require('node:fs');const path=require('node:path');",
  "const release=path.join(process.env.LA_E2E_LIFECYCLE_DIR,'release-owned-node');",
  'const timer=setInterval(()=>{if(fs.existsSync(release)){clearInterval(timer);process.exit(0);}},20);',
  "process.stdin.once('end',()=>console.log(JSON.stringify({inputEnded:true})));process.stdin.resume();",
].join('');

test('retained-handle exact scripts distinguish natural EOF exit from explicit owned-marker release', { timeout: 15_000 }, async () => {
  const { spawn } = require('node:child_process');
  for (const [script, markerControlled] of [
    [previousRetainedHandleNodeScript, false],
    [retainedHandleNodeScript, true],
  ]) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'la-retained-eof-'));
    const release = path.join(directory, 'release-owned-node');
    const child = spawn(process.execPath, ['-e', script], {
      env: { ...process.env, LA_E2E_LIFECYCLE_DIR: directory },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const closed = new Promise((resolve) => child.once('close', (code, signal) => resolve({ code, signal })));
    let stderrBytes = 0;
    child.stderr.on('data', (chunk) => {
      stderrBytes += chunk.length;
    });
    const next = readLines(child.stdout);
    child.stdin.end();
    try {
      if (markerControlled) {
        assert.deepEqual(await next(), { inputEnded: true });
        assert.equal(child.exitCode, null, 'EOF must not release the marker-controlled child');
        assert.equal(fs.existsSync(release), false);
        fs.writeFileSync(release, '');
      }
      assert.deepEqual(await closed, { code: 0, signal: null });
      assert.equal(stderrBytes, 0);
      assert.equal(fs.existsSync(release), markerControlled, 'The previous script exits naturally before explicit release');
    } finally {
      fs.writeFileSync(release, '');
      await closed;
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

function retainedHandlePowerShellScript(nodeArguments = `-e "${retainedHandleNodeScript}"`) {
  return [
    '$diagnostic = Join-Path $env:LA_E2E_LIFECYCLE_DIR "retained-handle.diagnostic.jsonl";',
    '$receiptSequence = 0; $receiptDropped = 0;',
    'function Receipt($operation,$state) { try { $script:receiptSequence++; @{operation=$operation;state=$state;sequence=$script:receiptSequence;dropped=$script:receiptDropped;wallTime=[DateTime]::UtcNow.ToString("o");monotonicMs=([Diagnostics.Stopwatch]::GetTimestamp()*1000.0/[Diagnostics.Stopwatch]::Frequency)} | ConvertTo-Json -Compress | Add-Content -LiteralPath $diagnostic } catch { $script:receiptDropped++ } };',
    '$info = New-Object System.Diagnostics.ProcessStartInfo;',
    `$info.FileName = '${process.execPath.replace(/'/g, "''")}';`,
    `$info.Arguments = '${nodeArguments.replace(/'/g, "''")}';`,
    '$info.UseShellExecute = $false; $info.RedirectStandardInput = $true; $info.RedirectStandardError = $true; $info.RedirectStandardOutput = $true;',
    '$node = New-Object System.Diagnostics.Process; $node.StartInfo = $info;',
    'Receipt "node-start" @{argvCount=2};',
    'try { [void]$node.Start() } catch { Receipt "node-start-error" @{errorClass="NativeStartError";hresult=$_.Exception.HResult}; throw };',
    'Receipt "node-started" @{pid=$node.Id;exited=$node.HasExited};',
    '$exitRecorded = $false;',
    'function RecordNodeExit { if (-not $script:exitRecorded -and $node.HasExited) { $script:exitRecorded=$true; try {',
    '$buffer = New-Object char[] 4096; $count=$node.StandardError.Read($buffer,0,4096); $text=[string]::new($buffer,0,$count);',
    '$bytes=[Text.Encoding]::UTF8.GetBytes($text); $sha=[Security.Cryptography.SHA256]::Create();',
    '$digest=([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-","").ToLowerInvariant(); $sha.Dispose();',
    '$class="UnknownError"; foreach ($known in @("SyntaxError","TypeError","RangeError","Error")) { if ($text -match ("\\b"+$known+"\\b")) { $class=$known; break } };',
    '$code=$null; if ($text -cmatch "\\b(ERR_[A-Z0-9_]{1,40}|E[A-Z0-9_]{1,40})\\b") { $code=$Matches[1] };',
    'Receipt "node-exit" @{pid=$node.Id;exitCode=$node.ExitCode;errorClass=$class;errorCode=$code;sha256=$digest;bytes=$bytes.Length;capped=($count -eq 4096)};',
    '} catch { Receipt "node-exit-diagnostic-unavailable" @{pid=$node.Id} } } };',
    '$held = $node.Handle;',
    '$node.StandardInput.Close();',
    `$inputEnded = $node.StandardOutput.ReadLine() -ceq '{"inputEnded":true}';`,
    'Receipt "node-input-ended" @{pid=$node.Id;observed=$inputEnded;exited=$node.HasExited};',
    '@{pid=$node.Id;directory=$env:LA_E2E_LIFECYCLE_DIR;held=$held.ToInt64();inputEnded=$inputEnded} | ConvertTo-Json -Compress;',
    '$releaseNode = Join-Path $env:LA_E2E_LIFECYCLE_DIR "release-owned-node";',
    'Receipt "release-node-wait" @{pid=$node.Id};',
    'while (-not (Test-Path -LiteralPath $releaseNode)) { RecordNodeExit; Start-Sleep -Milliseconds 20; }',
    'Receipt "release-node-marker-observed" @{pid=$node.Id;exited=$node.HasExited};',
    '$node.WaitForExit();',
    'RecordNodeExit;',
    '@{pid=$node.Id;exited=$node.HasExited;held=$node.Handle.ToInt64()} | ConvertTo-Json -Compress;',
    '$releaseOwner = Join-Path $env:LA_E2E_LIFECYCLE_DIR "release-handle-owner";',
    'while (-not (Test-Path -LiteralPath $releaseOwner)) { Start-Sleep -Milliseconds 20; }',
    'Receipt "release-handle-marker-observed" @{pid=$node.Id};',
    '$node.Dispose();',
    'Receipt "retained-handle-disposed" @{released=$true};',
  ].join(' ');
}

test(
  'Windows Job proves owned Node exit with retained .NET handle, not missing command metadata; outside parent is refused',
  {
    skip: process.platform !== 'win32',
    timeout: 35_000,
  },
  async () => {
    const nodeScript = retainedHandleNodeScript;
    const script = retainedHandlePowerShellScript();
    const powershell = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const launch = spawnContainedProcess(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env } });
    const trace = createDiagnosticProducer({
      producer: 'retained-handle-fixture',
      binding: {
        ...diagnosticBinding(),
        suite: 'unitTests',
        phase: 'retained-handle-control',
        nativeInvocation: launch.diagnosticInvocation,
      },
      sink: (line) => console.log(`[e2e-operation] ${line.trim()}`),
    });
    const fixtureSpan = trace.start('retained-handle-control', {
      argvCount: 4,
      lastState: { sha256: require('node:crypto').createHash('sha256').update(nodeScript).digest('hex') },
    });
    const next = readLines(launch.child.stdout);
    const closed = new Promise((resolve) => launch.child.once('close', (code, signal) => resolve({ code, signal })));
    launch.child.stdin.end();
    let directory = launch.diagnosticDirectory;
    let bodyPassed = false;
    try {
      const ready = await next();
      directory = ready.directory;
      assert.ok(ready.held);
      assert.equal(ready.inputEnded, true, 'Native child must acknowledge explicit stdin EOF before observation');
      const before = await observeProcesses(ready.directory, [ready.pid, process.pid]);
      const original = before.processes.find((record) => record.pid === ready.pid);
      assert.equal(original.metadataStatus, 'captured');
      assert.equal(before.processes.find((record) => record.pid === process.pid).metadataStatus, 'not-in-job');
      assert.equal(fs.existsSync(path.join(directory, 'release-owned-node')), false);
      fs.writeFileSync(path.join(directory, 'release-owned-node'), '');
      trace.emit('release-owned-node-marker-written', 'end');
      const exited = await next();
      assert.equal(exited.exited, true);
      assert.equal(exited.held, ready.held);
      const after = await observeProcesses(ready.directory, [ready.pid]);
      assert.equal(after.processes[0].metadataStatus, 'exited');
      assert.equal(after.processes[0].exitProof.source, 'GetProcessTimes');
      assert.equal(originalProcessReleased(original, after.processes[0]), true);
      assert.equal(fs.existsSync(path.join(directory, 'release-handle-owner')), false);
      bodyPassed = true;
      fixtureSpan.end();
    } catch (error) {
      fixtureSpan.fail(error);
      throw error;
    } finally {
      if (directory) {
        fs.writeFileSync(path.join(directory, 'release-owned-node'), '');
        fs.writeFileSync(path.join(directory, 'release-handle-owner'), '');
        trace.emit('release-handle-owner-marker-written', 'end');
      }
      const { code, signal } = await closed;
      // No raw stderr or command enters artifacts. Native records retain their
      // original clock/sequence and are not ordered by ingestion time.
      try {
        const file = path.join(directory, 'retained-handle.diagnostic.jsonl');
        if (fs.statSync(file).size <= 16384) {
          for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).slice(0, 12)) {
            const native = JSON.parse(line);
            const operations = [
              'node-start',
              'node-start-error',
              'node-started',
              'node-input-ended',
              'node-exit',
              'node-exit-diagnostic-unavailable',
              'release-node-wait',
              'release-node-marker-observed',
              'release-handle-marker-observed',
              'retained-handle-disposed',
            ];
            trace.emit(operations.includes(native.operation) ? native.operation : 'unknown-native-fixture-operation', 'end', {
              state: {
                ...native.state,
                nativeSequence: native.sequence,
                nativeWallTimeMs: Date.parse(native.wallTime),
                nativeMonotonicMs: native.monotonicMs,
                dropped: native.dropped,
              },
              ...(native.state?.errorClass ? { error: { name: native.state.errorClass, code: native.state.errorCode } } : {}),
            });
          }
        }
      } catch (error) {
        trace.emit('retained-handle-receipt-unavailable', 'failure', { error });
      }
      trace.summary(bodyPassed ? 'passed' : 'failed', code === 0 && signal === null ? 'passed' : 'failed');
      assert.equal(launch.readClosure(code, signal).verified, true);
    }
  }
);

test(
  'retained-handle native error control captures early Node failure before any release marker without raw stderr',
  {
    skip: process.platform !== 'win32',
    timeout: 35000,
  },
  async () => {
    const script = retainedHandlePowerShellScript(`-e "throw new TypeError('private-customer-token-control')"`);
    const powershell = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const launch = spawnContainedProcess(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env } });
    const closed = new Promise((resolve) => launch.child.once('close', (code, signal) => resolve({ code, signal })));
    const directory = launch.diagnosticDirectory;
    const diagnosticFile = path.join(directory, 'retained-handle.diagnostic.jsonl');
    launch.child.stdin.end();
    try {
      // Consume only the fixture's readiness signal; never retain stderr.
      await readLines(launch.child.stdout)();
      let receipts;
      const deadline = Date.now() + 10000;
      for (;;) {
        if (fs.existsSync(diagnosticFile) && fs.statSync(diagnosticFile).size <= 16384) {
          try {
            receipts = fs.readFileSync(diagnosticFile, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
          } catch {
            /* A partial diagnostic append is an observation, not a retry of the fixture. */
          }
        }
        if (receipts?.some((record) => record.operation === 'node-exit')) break;
        assert.ok(Date.now() < deadline, 'Native early-exit diagnostic was not observed');
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const exited = receipts.find((record) => record.operation === 'node-exit');
      assert.equal(exited.state.exitCode, 1);
      assert.equal(exited.state.errorClass, 'TypeError');
      assert.match(exited.state.sha256, /^[a-f0-9]{64}$/);
      assert.ok(exited.state.bytes > 0 && exited.state.bytes <= 16384);
      assert.equal(fs.existsSync(path.join(directory, 'release-owned-node')), false);
      assert.equal(
        receipts.some((record) => record.operation === 'release-node-marker-observed'),
        false
      );
      assert.ok(!JSON.stringify(receipts).includes('private-customer-token-control'));
      assert.ok(receipts.every((record, index) => index === 0 || record.sequence > receipts[index - 1].sequence));
      assert.equal(exited.state.errorCode, null, 'Case-insensitive matching must not mistake a dynamic word for a known Node code');
    } finally {
      fs.writeFileSync(path.join(directory, 'release-owned-node'), '');
      fs.writeFileSync(path.join(directory, 'release-handle-owner'), '');
      const { code, signal } = await closed;
      assert.equal(launch.readClosure(code, signal).verified, true);
    }
  }
);

test(
  'native scoped listener receipt correlates exact owned Node listener and refuses foreign HTTP 200 without outside metadata',
  {
    skip: !['win32', 'linux'].includes(process.platform),
    timeout: 30_000,
  },
  async () => {
    const foreign = await server200();
    const script = [
      "const http=require('node:http');",
      "const server=http.createServer((q,r)=>r.end('owned control, not product Func'));",
      "server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({pid:process.pid,port:server.address().port,directory:process.env.LA_E2E_LIFECYCLE_DIR})));",
      "process.stdin.once('data',()=>server.close(()=>process.exit(0)));process.stdin.resume();",
    ].join('');
    const launch = spawnContainedProcess(process.execPath, ['-e', script], { env: { ...process.env } });
    const next = readLines(launch.child.stdout);
    const closed = new Promise((resolve) => launch.child.once('close', (code, signal) => resolve({ code, signal })));
    try {
      const ready = await next();
      const native = await observeProcesses(ready.directory, [ready.pid], [ready.port, foreign.port]);
      const owned = native.listeners.find((record) => record.port === ready.port);
      assert.equal(owned.pid, ready.pid);
      assert.equal(owned.matchedRoot, ready.pid);
      assert.equal(owned.ancestry[0].metadataStatus, 'captured');
      const outside = native.listeners.find((record) => record.port === foreign.port);
      assert.ok(outside);
      assert.equal(outside.matchedRoot, null);
      assert.deepEqual(outside.ancestry, []);
      assert.equal(foreign.requests(), 0);
    } finally {
      launch.child.stdin.end('close');
      const { code, signal } = await closed;
      assert.equal(launch.readClosure(code, signal).verified, true);
      await foreign.close();
    }
  }
);
