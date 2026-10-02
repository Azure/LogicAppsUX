/* global process, require */
const assert = require('node:assert/strict');
const test = require('node:test');
const { createProcessObservationProvider } = require('./e2e-cli-process-observation');
const { OwnedProcessEvidenceError } = require('./e2e-cli-owned-processes');

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
    assert.ok(script.indexOf('$held.Handle') < script.indexOf('$current=Get-CimInstance'));
    assert.ok(script.indexOf('$current=Get-CimInstance') < script.indexOf('Stop-Process -Id'));
    assert.match(script, /CreationDate\.ToUniversalTime\(\)\.Ticks\.ToString\(\) -cne/);
    assert.match(script, /ExecutablePath.* -cne/);
    assert.match(script, /WaitForExit/);
    assert.match(script, /finally .*Dispose/);
    assert.doesNotMatch(script, /Stop-Process -Name|taskkill|\/T|Kill\(true\)/);
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
