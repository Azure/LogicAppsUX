/* global __dirname, process, require, setInterval, clearInterval, setTimeout, clearTimeout */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { once } = require('node:events');
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

function observerHarness(f, deactivate) {
  const intervals = new Map();
  let timerId = 0;
  const module = { exports: {} };
  const main = path.join(f.root, 'product-main.js');
  const loaded = { loaded: true, exports: { deactivate } };
  const api = {
    tasks: { onDidStartTaskProcess: () => ({ dispose() {} }), taskExecutions: [] },
    debug: {},
    extensions: { getExtension: () => ({ activate: async () => {}, extensionPath: f.root, packageJSON: { main: 'product-main.js' } }) },
    workspace: { workspaceFolders: [{ uri: { fsPath: f.workspace } }] },
    version: 'synthetic-vscode-api',
  };
  const loadedRequire = (id) => require(id);
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
      setTimeout,
    },
    { filename: 'actual-lifecycle-observer.js' }
  );
  return { install: () => module.exports.installLifecycleObserver(api, f.launch.environment, f.context), intervals };
}

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

test(
  'Windows Job proves owned Node exit with retained .NET handle, not missing command metadata; outside parent is refused',
  {
    skip: process.platform !== 'win32',
    timeout: 35_000,
  },
  async () => {
    const script = [
      '$info = New-Object System.Diagnostics.ProcessStartInfo;',
      `$info.FileName = '${process.execPath.replace(/'/g, "''")}';`,
      "$info.Arguments = '-e \"process.stdin.once(''data'',()=>process.exit(0));process.stdin.resume();\"';",
      '$info.UseShellExecute = $false; $info.RedirectStandardInput = $true;',
      '$node = New-Object System.Diagnostics.Process; $node.StartInfo = $info; [void]$node.Start();',
      '$held = $node.Handle;',
      '@{pid=$node.Id;directory=$env:LA_E2E_LIFECYCLE_DIR;held=$held.ToInt64()} | ConvertTo-Json -Compress;',
      '[void][Console]::ReadLine(); $node.StandardInput.WriteLine("exit"); $node.StandardInput.Flush(); $node.WaitForExit();',
      '@{pid=$node.Id;exited=$node.HasExited;held=$node.Handle.ToInt64()} | ConvertTo-Json -Compress;',
      '[void][Console]::ReadLine(); $node.Dispose();',
    ].join(' ');
    const powershell = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const launch = spawnContainedProcess(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env } });
    const next = readLines(launch.child.stdout);
    const closed = new Promise((resolve) => launch.child.once('close', (code, signal) => resolve({ code, signal })));
    try {
      const ready = await next();
      assert.ok(ready.held);
      const before = await observeProcesses(ready.directory, [ready.pid, process.pid]);
      const original = before.processes.find((record) => record.pid === ready.pid);
      assert.equal(original.metadataStatus, 'captured');
      assert.equal(before.processes.find((record) => record.pid === process.pid).metadataStatus, 'not-in-job');
      launch.child.stdin.write('exit-node\n');
      const exited = await next();
      assert.equal(exited.exited, true);
      assert.equal(exited.held, ready.held);
      const after = await observeProcesses(ready.directory, [ready.pid]);
      assert.equal(after.processes[0].metadataStatus, 'exited');
      assert.equal(after.processes[0].exitProof.source, 'GetProcessTimes');
      assert.equal(originalProcessReleased(original, after.processes[0]), true);
    } finally {
      launch.child.stdin.end('close-owner\n');
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
