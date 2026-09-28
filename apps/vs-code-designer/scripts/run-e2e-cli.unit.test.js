/* global console, process, require */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  _test: {
    collectRuntimeDependencyDiagnostics,
    copyAzureLogicAppsChannelLogs,
    createIsolatedRuntimeDependenciesRoot,
    findAzureLogicAppsChannelLogs,
    getFuncCoreToolsCandidatePaths,
    getFuncCoreToolsBinaryPath,
    verifyFuncCoreToolsAtDependencyRoot,
    writeVscodeProfileLogIndex,
  },
} = require('./run-e2e-cli.js');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'run-e2e-cli-unit-'));

try {
  testCreatesEmptyIsolatedDependencyRoot();
  testFailFastMissingFuncDiagnostics();
  testFailFastMissingInProc8Diagnostics();
  testCopiesAzureLogicAppsChannelLogs();
  console.log('[run-e2e-cli.unit] all tests passed');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function testCreatesEmptyIsolatedDependencyRoot() {
  const root = createIsolatedRuntimeDependenciesRoot('unit-test');
  try {
    assert.ok(root.startsWith(os.tmpdir()), `root should be isolated under the OS temp directory: ${root}`);
    assert.ok(path.basename(root).startsWith('logicappsux-vscode-e2e-runtime-deps-'), `root should be test-owned: ${root}`);
    assert.deepStrictEqual(fs.readdirSync(root), []);
    assert.strictEqual(path.basename(getFuncCoreToolsBinaryPath(root)), process.platform === 'win32' ? 'func.exe' : 'func');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testFailFastMissingFuncDiagnostics() {
  const root = path.join(tempRoot, 'missing-func-root');
  fs.mkdirSync(root, { recursive: true });
  assert.throws(
    () => verifyFuncCoreToolsAtDependencyRoot(root, 'unit missing func'),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Missing required Func Core Tools executable/);
      assert.match(error.message, /configured launcher/);
      assert.match(error.message, /in-proc8 worker host/);
      assert.match(error.message, /before opening the designer/);
      assert.match(error.message, /dependencyRoot entries/);
      return true;
    }
  );

  assert.match(collectRuntimeDependencyDiagnostics(root), /FuncCoreTools entries=\["<missing>"\]/);
}

function testFailFastMissingInProc8Diagnostics() {
  const root = path.join(tempRoot, 'missing-inproc8-root');
  const executableName = process.platform === 'win32' ? 'func.exe' : 'func';
  const configuredFunc = path.join(root, 'FuncCoreTools', executableName);
  const optionalInProc6Func = path.join(root, 'FuncCoreTools', 'in-proc6', executableName);
  fs.mkdirSync(path.dirname(optionalInProc6Func), { recursive: true });
  fs.writeFileSync(configuredFunc, 'placeholder');
  fs.writeFileSync(optionalInProc6Func, 'not required by the MSN Weather .NET 8 profile');

  assert.ok(getFuncCoreToolsCandidatePaths(root).includes(optionalInProc6Func), 'optional in-proc6 candidate should be discovered');
  assert.throws(
    () => verifyFuncCoreToolsAtDependencyRoot(root, 'unit missing in-proc8'),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Missing required Func Core Tools executable/);
      assert.match(error.message, /in-proc8 worker host/);
      assert.doesNotMatch(error.message, /in-proc6 worker host/);
      return true;
    }
  );
}

function testCopiesAzureLogicAppsChannelLogs() {
  const logsRoot = path.join(tempRoot, 'logs');
  const channelDir = path.join(logsRoot, '20260928T030206', 'window1', 'exthost', 'output_logging_20260928T030211');
  const channelLog = path.join(channelDir, '11-Azure Logic Apps (Standard).log');
  fs.mkdirSync(channelDir, { recursive: true });
  fs.writeFileSync(channelLog, 'bundle healthy\nfunc not found\n');

  const profileDestination = path.join(tempRoot, 'profile-destination');
  fs.mkdirSync(profileDestination, { recursive: true });

  const discovered = findAzureLogicAppsChannelLogs(logsRoot);
  assert.deepStrictEqual(discovered, [channelLog]);

  const copied = copyAzureLogicAppsChannelLogs(logsRoot, profileDestination);
  assert.deepStrictEqual(copied, [path.relative(logsRoot, channelLog)]);
  assert.ok(
    fs.readdirSync(path.join(profileDestination, 'azure-logic-apps-channel')).some((name) => name.endsWith('.log')),
    'channel log should be copied to top-level channel directory'
  );

  writeVscodeProfileLogIndex(profileDestination, {
    label: 'msnWeatherLifecycle',
    phase: 'msn-weather-run',
    userDataSuffix: 'msn-weather-run-123',
    sourceLogsDir: logsRoot,
    userDataDir: path.join(tempRoot, 'user-data'),
    channelLogs: copied,
    expectAzureLogicAppsChannel: true,
  });
  assert.match(fs.readFileSync(path.join(profileDestination, 'profile-log-index.md'), 'utf-8'), /msn-weather-run/);
}
