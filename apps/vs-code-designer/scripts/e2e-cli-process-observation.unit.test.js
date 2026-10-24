/* global process, require */
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const test = require('node:test');
const { clearTimeout, setTimeout } = require('node:timers');
const { createProcessObservationProvider } = require('./e2e-cli-process-observation');
const { OwnedProcessEvidenceError } = require('./e2e-cli-owned-processes');

async function waitForExit(child, timeoutMs = 10_000) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  let timer;
  try {
    await Promise.race([
      once(child, 'exit'),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out waiting for PID ${child.pid} to exit`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function stopChild(child) {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill();
  }
  await waitForExit(child);
}

async function observeChild(provider, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const records = await provider.snapshot(Math.max(1, deadline - Date.now()));
    const record = records.find((candidate) => candidate.pid === child.pid);
    if (record) {
      return record;
    }
  }
  throw new Error(`PID ${child.pid} was not observed before the native-test deadline`);
}

function spawnTestChild() {
  return spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
    windowsHide: true,
  });
}

for (const text of ['not-json', '{}', 'null', '123']) {
  test(`Windows provider rejects malformed snapshot ${text} without any process action`, async () => {
    let calls = 0;
    const provider = createProcessObservationProvider('win32', () => {
      calls++;
      return text;
    });
    await assert.rejects(provider.snapshot(100), (error) => error.reason === 'invalid-native-process-observation');
    assert.equal(calls, 1);
  });
}

test('Windows provider transports identity-only snapshot and preserves the exact supplied budget', async () => {
  const record = { pid: 101, parentPid: 1, creationIdentity: '12345', executable: process.execPath };
  const provider = createProcessObservationProvider('win32', (script, budget, input) => {
    assert.equal(budget, 123);
    assert.equal(input, undefined);
    assert.match(script, /Get-CimInstance Win32_Process/);
    assert.doesNotMatch(script, /CommandLine|Stop-Process|taskkill/);
    return `\uFEFF${JSON.stringify([record])}`;
  });
  assert.deepEqual(await provider.snapshot(123), [record]);
});

test('expired Windows observation and exact-action budgets do not start any native operation', async () => {
  let calls = 0;
  const provider = createProcessObservationProvider('win32', () => {
    calls++;
    return '[]';
  });
  const record = { pid: 101, parentPid: 1, creationIdentity: '12345', executable: process.execPath };
  for (const budget of [0, -1, 0.5, NaN, Infinity]) {
    await assert.rejects(provider.snapshot(budget), (error) => error.reason === 'observation-budget-exhausted');
    await assert.rejects(provider.terminateExact(record, budget), (error) => error.reason === 'observation-budget-exhausted');
  }
  assert.equal(calls, 0);
});

test('Windows exact action pins a handle before fresh identity validation and targets only the captured PID', async () => {
  const record = { pid: 101, parentPid: 1, creationIdentity: '12345', executable: process.execPath };
  let calls = 0;
  const provider = createProcessObservationProvider('win32', (script, budget, input) => {
    calls++;
    assert.deepEqual(JSON.parse(input), {
      pid: record.pid,
      creationIdentity: record.creationIdentity,
      executable: record.executable.toLowerCase(),
      budget,
    });
    assert.ok(script.indexOf('$handle=$held.Handle') < script.indexOf('$current=Get-CimInstance'));
    assert.ok(script.indexOf('$current=Get-CimInstance') < script.indexOf('[ExactProcessTermination]::Terminate($handle'));
    assert.match(script, /DllImport\("kernel32\.dll", SetLastError=true\)/);
    assert.match(script, /TerminateProcess\(IntPtr processHandle, uint exitCode\)/);
    assert.match(script, /CreationDate\.ToUniversalTime\(\)\.Ticks\.ToString\(\) -cne/);
    assert.match(script, /ExecutablePath.* -cne/);
    assert.match(script, /WaitForExit/);
    assert.match(script, /finally \{/);
    assert.match(script, /\$held\.Dispose\(\)/);
    assert.doesNotMatch(script, /Stop-Process|taskkill|\/T|Kill\(true\)/);
    return '';
  });
  await provider.terminateExact(record, 100);
  assert.equal(calls, 1);
});

test('invalid exact PID or creation identity cannot reach a native operation', async () => {
  let calls = 0;
  const provider = createProcessObservationProvider('win32', () => {
    calls++;
    return '';
  });
  for (const record of [
    { pid: 0, creationIdentity: '123' },
    { pid: 1.5, creationIdentity: '123' },
    { pid: 1, creationIdentity: 'bad' },
  ]) {
    await assert.rejects(provider.terminateExact(record, 100), (error) => error.reason === 'invalid-exact-process-identity');
  }
  assert.equal(calls, 0);
});

test('native identity-operation failure remains fatal rather than authorizing an exit claim', async () => {
  const provider = createProcessObservationProvider('win32', () => {
    throw new OwnedProcessEvidenceError('native-process-operation-failed');
  });
  await assert.rejects(provider.snapshot(100), (error) => error.reason === 'native-process-operation-failed');
  await assert.rejects(
    provider.terminateExact({ pid: 101, creationIdentity: '12345', executable: process.execPath }, 100),
    (error) => error.reason === 'native-process-operation-failed'
  );
});

test('Linux provider offers observation only and unsupported platforms remain explicit failures', () => {
  assert.equal(createProcessObservationProvider('linux').terminateExact, undefined);
  assert.throws(
    () => createProcessObservationProvider('unsupported'),
    (error) => error.reason === 'unsupported-process-observation-platform'
  );
});

test('actual host provider observes the current live identity without executing any termination', async () => {
  const provider = createProcessObservationProvider();
  const records = await provider.snapshot(10_000);
  const owners = records.filter((record) => record.pid === process.pid);
  assert.equal(owners.length, 1);
  assert.equal(typeof owners[0].creationIdentity, 'string');
  assert.ok(owners[0].creationIdentity);
  assert.ok(owners[0].executable);
  assert.ok(Number.isSafeInteger(owners[0].parentPid));
});

test(
  'Windows native exact termination exits the process through the production pinned-handle path',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const provider = createProcessObservationProvider();
    const child = spawnTestChild();
    t.after(() => stopChild(child));
    const record = await observeChild(provider, child);

    await provider.terminateExact(record, 10_000);
    await waitForExit(child);

    const after = await provider.snapshot(10_000);
    assert.equal(
      after.some((candidate) => candidate.pid === record.pid && candidate.creationIdentity === record.creationIdentity),
      false
    );
  }
);

test(
  'Windows native exact termination fails closed when the captured process already exited',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const provider = createProcessObservationProvider();
    const child = spawnTestChild();
    const sentinel = spawnTestChild();
    t.after(() => Promise.all([stopChild(child), stopChild(sentinel)]));
    const record = await observeChild(provider, child);
    const sentinelRecord = await observeChild(provider, sentinel);
    await stopChild(child);

    await assert.rejects(provider.terminateExact(record, 10_000), (error) => error.reason === 'native-process-operation-failed');

    const after = await provider.snapshot(10_000);
    assert.ok(
      after.some((candidate) => candidate.pid === sentinelRecord.pid && candidate.creationIdentity === sentinelRecord.creationIdentity),
      'An already-exited captured identity must not authorize terminating another live process'
    );
  }
);

test(
  'Windows native exact termination rejects identity mismatch without terminating the live process',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const provider = createProcessObservationProvider();
    const child = spawnTestChild();
    t.after(() => stopChild(child));
    const record = await observeChild(provider, child);
    const mismatched = { ...record, creationIdentity: (BigInt(record.creationIdentity) + 1n).toString() };

    await assert.rejects(provider.terminateExact(mismatched, 10_000), (error) => error.reason === 'native-process-operation-failed');

    const after = await provider.snapshot(10_000);
    assert.ok(
      after.some((candidate) => candidate.pid === record.pid && candidate.creationIdentity === record.creationIdentity),
      'Identity mismatch must leave the original live process untouched'
    );
  }
);
