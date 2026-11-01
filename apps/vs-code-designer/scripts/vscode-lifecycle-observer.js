/* global clearInterval, module, process, require, setInterval, setTimeout */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { validOriginalIdentity, sameOriginalIdentity, originalProcessReleased } = require('./vscode-lifecycle-identity');

const extensionId = 'ms-azuretools.vscode-azurelogicapps';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readRealJson(file) {
  assert.ok(fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink(), 'Lifecycle receipt must be a real file');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function observeProcesses(directory, pids, ports = []) {
  const request = path.join(directory, `${crypto.randomUUID()}.request`);
  const ids = [...new Set(pids)];
  assert.ok(ids.length <= 64 && ids.every((pid) => Number.isSafeInteger(pid) && pid > 0), 'Invalid scoped PID request');
  assert.ok(ports.length <= 64 && ports.every((port) => Number.isSafeInteger(port) && port > 0 && port <= 65535));
  // Publish a complete request atomically; the retained owner polls concurrently.
  fs.writeFileSync(`${request}.tmp`, [...ids, ...ports.map((port) => `port:${port}`)].join('\n'), { flag: 'wx' });
  fs.renameSync(`${request}.tmp`, request);
  const response = `${request}.response`;
  const deadline = Date.now() + 10_000;
  while (!fs.existsSync(response)) {
    assert.ok(Date.now() < deadline, 'Retained native owner did not answer the scoped PID request');
    await delay(50);
  }
  const native = readRealJson(response);
  assert.ok(Number.isFinite(Date.parse(native.observedAtUtc)), 'Native observation timestamp unavailable');
  assert.ok(Array.isArray(native.processes) && native.processes.length === ids.length, 'Native observer returned incomplete PID data');
  assert.deepEqual(
    native.processes.map((record) => record.pid).sort((a, b) => a - b),
    ids.sort((a, b) => a - b),
    'Native observer returned different PIDs'
  );
  assert.ok(
    process.platform === 'linux' ? native.ownershipComplete === true : native.ownershipComplete !== false,
    'Native retained ancestry observation is incomplete'
  );
  if (ports.length) {
    assert.deepEqual(native.requestedPorts, ports, 'Native current listener proof unavailable');
    assert.ok(Array.isArray(native.listeners), 'Native current listener proof unavailable');
  }
  return { receipt: response, ...native };
}

const normalize = (file) => (process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file));

function currentLogScope(context, env, hostPid = process.pid) {
  assert.ok(context?.logUri?.scheme === 'file', 'Current extension-host log URI unavailable');
  assert.ok(env.LA_E2E_CLI_USER_DATA_DIR && path.isAbsolute(env.LA_E2E_CLI_USER_DATA_DIR), 'Actual user-data profile binding unavailable');
  const profileLogs = fs.realpathSync(path.join(env.LA_E2E_CLI_USER_DATA_DIR, 'logs'));
  let host = path.resolve(context.logUri.fsPath);
  while (path.basename(host) !== 'exthost' && path.dirname(host) !== host) host = path.dirname(host);
  const relative = path.relative(normalize(profileLogs), normalize(host));
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Current host logs differ from the actual profile');
  assert.equal(normalize(fs.realpathSync(host)), normalize(host), 'Current host log scope traverses a link');
  const hostLog = path.join(host, 'exthost.log');
  const text = fs.readFileSync(hostLog, 'utf8');
  assert.ok(text.includes(`Extension host with pid ${hostPid} started`), 'Current host logger PID differs');
  return { directory: host, hostLog, profile: fs.realpathSync(env.LA_E2E_CLI_USER_DATA_DIR), extensionHostPid: hostPid };
}

function channelFiles(root, result = []) {
  assert.ok(!fs.lstatSync(root).isSymbolicLink(), 'Lifecycle log scope must not contain links');
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    assert.ok(!entry.isSymbolicLink(), 'Lifecycle log scope must not contain links');
    if (entry.isDirectory()) channelFiles(file, result);
    else if (/^\d+-Azure Logic Apps \(Standard\)\.log$/i.test(entry.name)) result.push(file);
  }
  return result;
}

function loggedResources(logRoot, workspaces, extensionHostPid = process.pid) {
  const files = channelFiles(logRoot);
  assert.ok(files.length > 0, 'Original native Logic Apps logger receipt unavailable');
  const ports = new Set();
  const pids = new Set();
  const launches = new Map();
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const projects = new Map();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const launch = /Launching design-time host for project "([^"\r\n]+)" from "([^"\r\n]+)" on port (\d+)\./.exec(line);
      if (launch) {
        const [, project, runtimeDirectory, portText] = launch;
        const port = Number(portText);
        assert.equal(normalize(path.dirname(runtimeDirectory)), normalize(project), 'Product runtime directory differs from project');
        assert.equal(path.basename(runtimeDirectory), 'workflow-designtime', 'Product design-time directory unavailable');
        projects.set(port, { project, runtimeDirectory, port, receipt: file });
        continue;
      }
      const command = /Running command: "([^\r\n]+)" with pid: "(\d+)"\.\.\./.exec(line);
      if (!command) continue;
      pids.add(Number(command[2]));
      const port = /(?:^|\s)--port\s+(\d+)(?:\s|$)/.exec(command[1]);
      if (!port) continue;
      const project = projects.get(Number(port[1]));
      assert.ok(project, 'Current command PID lacks its project/port launch record');
      if (workspaces)
        assert.ok(
          workspaces.some((workspace) => normalize(workspace) === normalize(project.project)),
          'Product launch is outside the current workspace'
        );
      launches.set(normalize(project.project), { ...project, launcherPid: Number(command[2]), extensionHostPid });
    }
    for (const match of text.matchAll(/Running command: "[^\r\n]+" with pid: "(\d+)"\.\.\./g)) pids.add(Number(match[1]));
  }
  assert.ok(
    [...ports].every((port) => port > 0 && port <= 65535),
    'Invalid port in original product logger'
  );
  for (const launch of launches.values()) ports.add(launch.port);
  return { ports: [...ports], pids: [...pids], receipts: files, launches: [...launches.values()] };
}

function currentRuntimeProof(resources, launch, native) {
  assert.ok(
    resources.launches.some((record) => JSON.stringify(record) === JSON.stringify(launch)),
    'Current product launch binding differs'
  );
  const listeners = native.listeners?.filter((record) => record.port === launch.port);
  assert.equal(listeners?.length, 1, 'Exact current runtime listener unavailable or ambiguous');
  const listener = listeners[0];
  assert.equal(listener.matchedRoot, launch.launcherPid, 'Responding runtime is not descended from the current product launcher');
  const ancestry = listener.ancestry;
  assert.ok(Array.isArray(ancestry) && ancestry.length > 0, 'Runtime native ancestry unavailable');
  assert.equal(ancestry[0].pid, listener.pid);
  assert.equal(ancestry.at(-1).pid, launch.launcherPid);
  for (const record of ancestry) {
    assert.ok(
      record.metadataStatus === 'captured' && validOriginalIdentity(record) && /^[a-f0-9]{64}$/.test(record.commandSummary?.sha256),
      'Runtime ancestry was not admitted by the current native owner'
    );
    if (process.platform === 'linux') {
      assert.equal(record.commandSummary.hashEncoding, 'linux-proc-cmdline-nul-bytes', 'Runtime full raw command hash unavailable');
    }
  }
  for (let index = 0; index + 1 < ancestry.length; index++) {
    assert.equal(ancestry[index].parentPid, ancestry[index + 1].pid, 'Current runtime native parent chain differs');
  }
  const launcher = native.processes.find((record) => record.pid === launch.launcherPid);
  const host = native.processes.find((record) => record.pid === launch.extensionHostPid);
  assert.ok(
    host?.metadataStatus === 'captured' && validOriginalIdentity(host) && /^[a-f0-9]{64}$/.test(host.commandSummary?.sha256),
    'Current runtime extension-host native identity unavailable'
  );
  assert.ok(sameOriginalIdentity(launcher, ancestry.at(-1)), 'Current launcher identity differs from listener ancestry');
  assert.equal(launcher.commandSummary.sha256, ancestry.at(-1).commandSummary.sha256);
  assert.equal(launcher.parentPid, host.pid, 'Product launcher does not belong to the current extension host');
  assert.ok(BigInt(launcher.startTimeTicks) >= BigInt(host.startTimeTicks), 'Product launcher predates the current extension host');
  assert.ok(
    /^(?:func|dotnet)(?:\.exe)?$/i.test(path.basename(ancestry[0].executablePath || '')) &&
      ancestry.some((record) => /^func(?:\.exe)?$/i.test(path.basename(record.executablePath || ''))),
    'Current listener is not backed by the product Func runtime'
  );
  return listener;
}

function healthResponse(port) {
  return new Promise((resolve, reject) => {
    const request = http.get(
      { hostname: '127.0.0.1', port, path: '/runtime/webhooks/workflow/api/management/operationGroups', timeout: 1000 },
      (response) => {
        response.resume();
        response.once('end', () => resolve({ port, statusCode: response.statusCode, observedAt: Date.now() }));
      }
    );
    request.on('timeout', () => request.destroy(new Error('Current runtime health response timed out')));
    request.on('error', reject);
  });
}

async function observeCurrentRuntime(directory, resources, launch) {
  const before = await observeProcesses(directory, [launch.launcherPid, launch.extensionHostPid], [launch.port]);
  const listener = currentRuntimeProof(resources, launch, before);
  const health = await healthResponse(launch.port);
  assert.equal(health.statusCode, 200, 'Current owned runtime did not respond successfully');
  const after = await observeProcesses(directory, [launch.launcherPid, launch.extensionHostPid], [launch.port]);
  const current = currentRuntimeProof(resources, launch, after);
  assert.deepEqual(current, listener, 'Runtime listener identity changed around the health response');
  return { launch, health, before, after, runtimePid: listener.pid };
}

function probeReleasedPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => server.close((error) => (error ? reject(error) : resolve())));
  });
}

// Runs in the actual extension host. Only supported VS Code task/debug APIs and
// the already-loaded test fixture lifecycle export are used; no private RPC.
async function installLifecycleObserver(vscode, env = process.env, context) {
  const directory = env.LA_E2E_LIFECYCLE_DIR;
  if (!directory) return undefined; // Non-native unit compilation does not invoke the exception.
  const binding = readRealJson(path.join(directory, 'binding.json'));
  assert.equal(binding.invocation, env.LA_E2E_LIFECYCLE_INVOCATION);
  const producerBindingReceipt = env.LA_E2E_LIFECYCLE_PRODUCER_BINDING || path.join(directory, 'producer-binding.json');
  const bindingRelative = path.relative(directory, producerBindingReceipt);
  assert.ok(
    bindingRelative && !bindingRelative.startsWith('..') && !path.isAbsolute(bindingRelative),
    'Producer binding escaped native owner'
  );
  const producerBinding = readRealJson(producerBindingReceipt);
  assert.equal(producerBinding.invocation, binding.invocation);
  assert.equal(normalize(producerBinding.profile), normalize(env.LA_E2E_CLI_USER_DATA_DIR || ''));
  const stat = fs.lstatSync(directory);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), 'Lifecycle owner directory must be real');
  const output = path.join(directory, `${crypto.randomUUID()}.observer.jsonl`);
  const append = (record) => {
    assert.equal(fs.realpathSync(directory), directory, 'Lifecycle directory identity changed');
    fs.appendFileSync(output, `${JSON.stringify({ schemaVersion: 1, ...binding, ...record })}\n`);
  };
  const taskPids = new Set();
  const taskRecords = [];
  const taskSubscription = vscode.tasks.onDidStartTaskProcess((event) => {
    const task = event.execution.task;
    if (task.name === 'func: host start' && task.scope?.uri) {
      taskPids.add(event.processId);
      taskRecords.push({ pid: event.processId, workspace: task.scope.uri.fsPath, observedAt: Date.now() });
    }
  });
  const extension = vscode.extensions.getExtension(extensionId);
  assert.ok(extension, 'Lifecycle recorder requires the real Logic Apps extension');
  await extension.activate();
  let startupIdentity;
  let parentIdentity;
  try {
    assert.ok(['win32', 'linux'].includes(process.platform), 'Unsupported native lifecycle platform');
    startupIdentity = await observeProcesses(directory, [process.pid]);
    if (startupIdentity)
      assert.ok(
        startupIdentity.processes.length === 1 &&
          startupIdentity.processes[0].metadataStatus === 'captured' &&
          validOriginalIdentity(startupIdentity.processes[0], process.platform),
        'Actual extension host identity was not admitted by the original native owner'
      );
    if (env.LA_E2E_LIFECYCLE_PARENT_DIR) {
      const parentBinding = readRealJson(path.join(env.LA_E2E_LIFECYCLE_PARENT_DIR, 'binding.json'));
      assert.equal(parentBinding.invocation, env.LA_E2E_LIFECYCLE_PARENT_INVOCATION);
      const native = await observeProcesses(env.LA_E2E_LIFECYCLE_PARENT_DIR, [process.pid, binding.rootPid]);
      assert.ok(
        native.processes.every((record) => record.metadataStatus === 'captured' && validOriginalIdentity(record, process.platform)),
        'Nested host lacks retained outer native ownership'
      );
      parentIdentity = { ...native, binding: parentBinding };
    }
  } catch (error) {
    startupIdentity = undefined;
    parentIdentity = undefined;
    append({ kind: 'error', observedAt: Date.now(), reason: `native-startup-observation-failed: ${error.message}` });
  }
  append({
    kind: 'startup',
    source: 'logicapps-subsequent-startup',
    invocation: binding.invocation,
    receipt: output,
    observedAt: Date.now(),
    launchId: `${binding.invocation}:${process.pid}`,
    extensionHostPid: process.pid,
    domain: 'extension-host',
    nativeIdentity: startupIdentity,
    parentIdentity,
    vscodeVersion: vscode.version,
    verified: Boolean(startupIdentity),
  });
  let matches;
  // VS Code's loader canonicalizes Windows casing; use the existing owned-host
  // fixture's unambiguous normalized cache selection, not require(main) again.
  try {
    const main = require.resolve(path.resolve(extension.extensionPath, extension.packageJSON.main));
    matches = Object.entries(require.cache).filter(([key]) => normalize(key) === normalize(main));
    assert.equal(matches.length, 1, 'Original loaded lifecycle entry selection must be unambiguous');
    const [, entry] = matches[0];
    assert.ok(
      entry?.loaded && entry.exports && typeof entry.exports.deactivate === 'function',
      'Original loaded deactivation export unavailable'
    );
  } catch (error) {
    append({ kind: 'error', observedAt: Date.now(), reason: `original-deactivation-observation-unavailable: ${error.message}` });
    return {
      receipt: output,
      shutdown: async () => append({ kind: 'error', observedAt: Date.now(), reason: 'original-deactivation-export-unavailable' }),
      dispose: () => taskSubscription.dispose(),
    };
  }
  const [cacheKey, entry] = matches[0];
  const original = entry.exports.deactivate;
  const exports = entry.exports;
  let finishing;
  let productFailure = false;
  const observedPorts = new Set();
  let polling = false;
  let stopped = false;
  let logScope;
  let lastStartupError;
  const workspaces = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
  const startupPoll = setInterval(async () => {
    if (polling || stopped) return;
    polling = true;
    let resources;
    try {
      assert.ok(startupIdentity, 'Current native extension-host identity unavailable');
      logScope = currentLogScope(context, env);
      if (producerBinding.requiredWorkspace) {
        assert.ok(
          workspaces.some((workspace) => normalize(workspace) === normalize(producerBinding.requiredWorkspace)),
          'Required startup workspace is not open'
        );
      }
      resources = loggedResources(logScope.directory, workspaces);
      if (producerBinding.requiredWorkspace) {
        assert.ok(resources.launches.length > 0, 'Current required workspace product launch/PID log binding unavailable');
      }
      for (const launch of resources.launches.filter((candidate) => !observedPorts.has(candidate.port))) {
        if (producerBinding.requiredWorkspace) assert.equal(normalize(launch.project), normalize(producerBinding.requiredWorkspace));
        const runtime = await observeCurrentRuntime(directory, resources, launch);
        if (!stopped) {
          observedPorts.add(launch.port);
          append({
            kind: 'startup',
            source: 'logicapps-subsequent-startup',
            receipt: output,
            observedAt: Date.now(),
            launchId: `${binding.invocation}:${process.pid}:${launch.port}`,
            extensionHostPid: process.pid,
            domain: 'design-time',
            verified: true,
            health: runtime.health,
            runtime,
            logScope,
            producerBinding,
            producerBindingReceipt,
            nativeIdentity: startupIdentity,
            parentIdentity,
            vscodeVersion: vscode.version,
          });
        }
      }
    } catch (error) {
      if (!stopped && lastStartupError !== error.message) {
        lastStartupError = error.message;
        append({ kind: 'startup-error', observedAt: Date.now(), reason: error.message });
      }
    } finally {
      polling = false;
    }
  }, 500);
  const shutdown = async () => {
    stopped = true;
    clearInterval(startupPoll);
    assert.equal(require.cache[cacheKey], entry, 'Original lifecycle entry changed');
    assert.equal(entry.exports, exports, 'Original lifecycle exports changed');
    assert.equal(exports.deactivate, original, 'Original lifecycle export changed');
    let resources;
    let before;
    let owned = [];
    let captureError;
    try {
      logScope = currentLogScope(context, env);
      resources = loggedResources(logScope.directory, workspaces);
      before = await observeProcesses(directory, [...resources.pids, ...taskPids]);
      owned = before.processes.filter((record) => record.metadataStatus === 'captured');
      assert.ok(
        before.processes.every(
          (record) =>
            record.metadataStatus === 'exited-before-inspection' ||
            (record.metadataStatus === 'exited' && originalProcessReleased(record, record)) ||
            (record.metadataStatus === 'captured' &&
              validOriginalIdentity(record, process.platform) &&
              /^[a-f0-9]{64}$/.test(record.commandSummary?.sha256))
        ),
        'Product logger/task PID was not admitted by the retained native owner'
      );
    } catch (error) {
      captureError = error;
    }
    // Explicitly invoke and await the original exported deactivation, exactly as
    // the existing owned-host test fixture does. Never replace it with a flag.
    try {
      await original.call(exports);
    } catch (error) {
      productFailure = true;
      throw error;
    }
    const shutdownAt = Date.now();
    if (captureError) {
      append({ kind: 'error', observedAt: shutdownAt, reason: captureError.message });
      return;
    }
    let after;
    const deadline = Date.now() + 10_000;
    for (;;) {
      after = await observeProcesses(
        directory,
        owned.map((record) => record.pid)
      );
      if (
        after.processes.every((record) =>
          originalProcessReleased(
            owned.find((candidate) => candidate.pid === record.pid),
            record
          )
        )
      )
        break;
      assert.ok(Date.now() < deadline, 'Original Logic Apps process identities did not exit after awaited deactivation');
      await delay(50);
    }
    assert.ok(
      !vscode.tasks.taskExecutions.some((execution) => execution.task.name === 'func: host start'),
      'Logic Apps runtime task remains active after deactivation'
    );
    assert.ok(vscode.debug.activeDebugSession?.type !== 'logicapp', 'Logic Apps debug session remains active after deactivation');
    const portProbes = [];
    for (const port of resources.ports) {
      await probeReleasedPort(port);
      portProbes.push({ port, observedAt: Date.now(), operation: 'exclusive-loopback-bind-and-release' });
    }
    append({
      kind: 'shutdown',
      extensionHostPid: process.pid,
      nativeIdentity: startupIdentity,
      shutdown: {
        source: 'logicapps-owned-shutdown',
        invocation: binding.invocation,
        receipt: output,
        observedAt: shutdownAt,
        verified: true,
        ownedProcesses: owned.map(({ pid, startTimeTicks, identity, commandSummary }) => ({
          pid,
          startTimeTicks,
          ...(identity ? { identity } : {}),
          commandSha256: commandSummary.sha256,
        })),
        processCaptureReceipt: before.receipt,
      },
      resources: {
        source: 'logicapps-resource-probe',
        invocation: binding.invocation,
        receipt: after.receipt,
        observedAt: Date.now(),
        verified: true,
        checked: ['runtime', 'design-time', 'ports', 'locks'],
        // Process-owned kernel handles are released by observed original process
        // exit. This is NOT a claim that workspace deletion/force-cleared files
        // proved resource release. Unknown surviving processes still block.
        processHandleRelease: after,
        ports: resources.ports,
        portProbes,
        productLogReceipts: resources.receipts,
        taskRecords,
        workspaceResources: (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath),
      },
    });
  };
  const observedDeactivate = async () => {
    // One actual product call per host, even after an observation failure.
    if (finishing) return finishing;
    finishing = shutdown().catch((error) => {
      append({
        kind: 'error',
        observedAt: Date.now(),
        reason: 'deactivation-or-original-resource-release-failed',
        productDeactivationFailed: productFailure,
      });
      // Preserve actual product export failures. Observation-only failures remain
      // explicit evidence failures, but must not add a gate to ordinary closure.
      if (productFailure) throw error;
    });
    return finishing;
  };
  return {
    receipt: output,
    shutdown: observedDeactivate,
    dispose: () => {
      stopped = true;
      clearInterval(startupPoll);
      taskSubscription.dispose();
    },
  };
}

module.exports = {
  installLifecycleObserver,
  loggedResources,
  currentLogScope,
  currentRuntimeProof,
  observeCurrentRuntime,
  observeProcesses,
  probeReleasedPort,
};
