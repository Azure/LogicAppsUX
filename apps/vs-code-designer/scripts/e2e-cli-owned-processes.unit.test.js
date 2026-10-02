/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global process, require, structuredClone */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createOwnedProcessCleanup } = require('./e2e-cli-owned-processes');

function fixture(t, platform = process.platform === 'win32' ? 'win32' : 'linux', overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'la-owned-process-control-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'MiXeD-Workspace');
  const dependencies = path.join(directory, 'MiXeD-Dependencies');
  fs.mkdirSync(workspace);
  fs.mkdirSync(dependencies);
  const executable = path.join(dependencies, 'MiXeD-Runtime.exe');
  fs.writeFileSync(executable, '');
  const creationIdentity = (ticks) => (platform === 'win32' ? String(ticks) : `11111111-1111-4111-8111-111111111111:${ticks}`);
  const owner = { pid: 101, parentPid: 1, creationIdentity: creationIdentity(100), executable: process.execPath };
  const ancestor = { pid: 102, parentPid: owner.pid, creationIdentity: creationIdentity(200), executable: process.execPath };
  const child = { pid: 103, parentPid: ancestor.pid, creationIdentity: creationIdentity(300), executable };
  let time = 100;
  let table = [owner, ancestor, child];
  const calls = [];
  const contract = {
    invocationId: crypto.randomUUID(),
    platform,
    owner,
    roots: [
      { kind: 'workspace', directory: workspace },
      { kind: 'dependencies', directory: dependencies },
    ],
    snapshot: async (budget) => {
      calls.push({ kind: 'snapshot', budget });
      return structuredClone(table);
    },
    terminateExact: async (record, budget) => {
      calls.push({ kind: 'terminate', record, budget });
      table = table.filter((item) => item.pid !== record.pid);
    },
    now: () => time,
    deadline: 1100,
    ...overrides,
  };
  return {
    contract,
    directory,
    workspace,
    dependencies,
    executable,
    owner,
    ancestor,
    child,
    creationIdentity,
    calls,
    setTable: (value) => {
      table = value;
    },
    setTime: (value) => {
      time = value;
    },
    guard: () => createOwnedProcessCleanup(contract),
  };
}

for (const platform of ['linux', 'win32']) {
  test(`${platform}: filesystem reads retain exact physical spelling under enforced case-sensitive lookup`, async (t) => {
    const context = fixture(t, platform);
    const lstat = fs.lstatSync;
    const realpath = fs.realpathSync;
    const physicalPaths = [context.workspace, context.dependencies, context.executable];
    const assertPhysical = (value) => {
      const expected = physicalPaths.find((candidate) => candidate.toLowerCase() === String(value).toLowerCase());
      if (expected && value !== expected) {
        throw Object.assign(new Error('incorrect-folded-physical-path-control'), { code: 'ENOENT' });
      }
    };
    fs.lstatSync = (value, ...options) => {
      assertPhysical(value);
      return lstat(value, ...options);
    };
    fs.realpathSync = (value, ...options) => {
      assertPhysical(value);
      return realpath(value, ...options);
    };
    try {
      const guard = context.guard();
      const captured = await guard.capture();
      assert.equal(captured.observedProcesses[0].executable, realpath(context.executable));
      assert.equal((await guard.finalize()).processExitVerified, true);
      assert.equal(context.calls.filter((call) => call.kind === 'terminate').length, 1);
    } finally {
      fs.lstatSync = lstat;
      fs.realpathSync = realpath;
    }
  });

  test(`${platform}: capture ancestry before teardown and prove exact-process exit separately from root cleanup`, async (t) => {
    const context = fixture(t, platform);
    const guard = context.guard();
    const captured = await guard.capture();
    assert.equal(captured.observedProcesses.length, 1);
    assert.deepEqual(
      captured.observedProcesses[0].ancestry.map((record) => record.pid),
      [context.ancestor.pid]
    );
    const terminal = await guard.finalize();
    assert.equal(terminal.processExitVerified, true);
    assert.equal(terminal.filesystemCleanupVerified, false);
    assert.equal(context.calls.filter((call) => call.kind === 'terminate').length, 1);
    assert.equal(fs.existsSync(context.workspace), true);
    assert.equal(fs.existsSync(context.dependencies), true);
  });

  test(`${platform}: natural exit is independently observed without any termination`, async (t) => {
    const context = fixture(t, platform);
    const guard = context.guard();
    await guard.capture();
    context.setTable([context.owner, context.ancestor]);
    const terminal = await guard.finalize();
    assert.equal(terminal.processExitVerified, true);
    assert.deepEqual(terminal.actions, []);
    assert.equal(
      context.calls.some((call) => call.kind === 'terminate'),
      false
    );
  });
}

for (const [name, change, reason] of [
  ['reused captured PID', (context) => [{ ...context.child, creationIdentity: 'replacement' }], 'captured-process-identity-changed'],
  ['changed captured executable', (context) => [{ ...context.child, executable: process.execPath }], 'captured-process-identity-changed'],
  ['missing captured creation identity', (context) => [{ ...context.child, creationIdentity: '' }], 'missing-process-identity'],
  ['new unobserved process in the owned executable scope', (context) => [{ ...context.child, pid: 104 }], 'uncaptured-owned-scope-process'],
]) {
  test(`${name} is fatal without executing any exact-PID action`, async (t) => {
    const context = fixture(t);
    const guard = context.guard();
    await guard.capture();
    context.setTable([context.owner, context.ancestor, ...change(context)]);
    await assert.rejects(guard.finalize(), (error) => error.reason === reason);
    assert.equal(
      context.calls.some((call) => call.kind === 'terminate'),
      false
    );
  });
}

for (const [name, table, reason] of [
  ['missing owner', (context) => [context.ancestor, context.child], 'owner-process-identity-changed'],
  [
    'reused owner PID',
    (context) => [{ ...context.owner, creationIdentity: 'replacement' }, context.ancestor, context.child],
    'owner-process-identity-changed',
  ],
  ['duplicate PID', (context) => [context.owner, context.ancestor, context.child, context.child], 'ambiguous-process-observation'],
  ['unproven parent', (context) => [context.owner, context.child], 'unproven-process-ancestry'],
  ['foreign ancestry', (context) => [context.owner, { ...context.ancestor, parentPid: 500 }, context.child], 'unproven-process-ancestry'],
  [
    'cycle',
    (context) => [context.owner, { ...context.ancestor, parentPid: context.child.pid }, context.child],
    'ambiguous-process-ancestry',
  ],
  [
    'missing ancestor creation identity',
    (context) => [context.owner, { ...context.ancestor, creationIdentity: '' }, context.child],
    'missing-process-identity',
  ],
  ['no scoped runtime', (context) => [context.owner, context.ancestor], 'missing-live-owned-process-observation'],
]) {
  test(`${name} at initial capture remains fatal`, async (t) => {
    const context = fixture(t);
    context.setTable(table(context));
    await assert.rejects(context.guard().capture(), (error) => error.reason === reason);
    assert.equal(
      context.calls.some((call) => call.kind === 'terminate'),
      false
    );
  });
}

test('reparenting is admitted only for the originally captured PID/creation/executable identity', async (t) => {
  const context = fixture(t);
  const guard = context.guard();
  await guard.capture();
  context.setTable([context.owner, { ...context.child, parentPid: 1 }]);
  assert.equal((await guard.finalize()).processExitVerified, true);
  assert.equal(context.calls.filter((call) => call.kind === 'terminate').length, 1);
});

test('reparenting without prior ancestry proof is not ownership', async (t) => {
  const context = fixture(t);
  context.setTable([context.owner, { ...context.child, parentPid: 1 }]);
  await assert.rejects(context.guard().capture(), (error) => error.reason === 'unproven-process-ancestry');
  assert.equal(
    context.calls.some((call) => call.kind === 'terminate'),
    false
  );
});

test('an observation-only provider retains the failure instead of manufacturing termination', async (t) => {
  const context = fixture(t, undefined, { terminateExact: undefined });
  const guard = context.guard();
  await guard.capture();
  await assert.rejects(guard.finalize(), (error) => error.reason === 'owned-process-still-alive-observation-only');
  assert.equal(guard.evidence().processExitVerified, false);
});

test('termination failure is fatal and sanitized', async (t) => {
  const context = fixture(t, undefined, {
    terminateExact: async () => {
      throw new Error('private-command-and-credential-control');
    },
  });
  const guard = context.guard();
  await guard.capture();
  await assert.rejects(guard.finalize(), (error) => {
    assert.equal(error.reason, 'exact-process-termination-failed');
    assert.equal(String(error).includes('private-command-and-credential-control'), false);
    return true;
  });
  assert.deepEqual(guard.evidence().actions, [
    { pid: context.child.pid, creationIdentity: context.child.creationIdentity, requested: true },
  ]);
});

test('a success-returning terminator does not prove process exit', async (t) => {
  const context = fixture(t, undefined, { terminateExact: async () => undefined });
  const guard = context.guard();
  await guard.capture();
  await assert.rejects(guard.finalize(), (error) => error.reason === 'owned-process-exit-not-observed');
});

test('observation error is fatal and sanitized', async (t) => {
  const context = fixture(t, undefined, {
    snapshot: async () => {
      throw new Error('private-observation-control');
    },
  });
  await assert.rejects(context.guard().capture(), (error) => {
    assert.equal(error.reason, 'process-observation-failed');
    assert.equal(String(error).includes('private-observation-control'), false);
    return true;
  });
});

test('original deadline and actual remaining timeout are preserved across capture and finalization', async (t) => {
  const context = fixture(t);
  const guard = context.guard();
  await guard.capture();
  context.setTime(600);
  await guard.finalize();
  assert.deepEqual(
    context.calls.filter((call) => call.kind === 'snapshot').map((call) => call.budget),
    [1000, 500, 500]
  );
  assert.equal(context.calls.find((call) => call.kind === 'terminate').budget, 500);
});

test('no observation or action starts at an expired deadline', async (t) => {
  const context = fixture(t);
  const guard = context.guard();
  await guard.capture();
  context.setTime(1100);
  await assert.rejects(guard.finalize(), (error) => error.reason === 'observation-budget-exhausted');
  assert.equal(context.calls.length, 1);
});

test('a snapshot that consumes the remaining budget cannot authorize an action', async (t) => {
  const context = fixture(t);
  const original = context.contract.snapshot;
  context.contract.snapshot = async (budget) => {
    const records = await original(budget);
    if (context.calls.length === 2) {
      context.setTime(1100);
    }
    return records;
  };
  const guard = context.guard();
  await guard.capture();
  await assert.rejects(guard.finalize(), (error) => error.reason === 'observation-budget-exhausted');
  assert.equal(
    context.calls.some((call) => call.kind === 'terminate'),
    false
  );
});

test('finite observation allowance is shared, not renewed for each process', async (t) => {
  const context = fixture(t, undefined, { maxObservations: 1 });
  const guard = context.guard();
  await guard.capture();
  await assert.rejects(guard.finalize(), (error) => error.reason === 'observation-budget-exhausted');
  assert.equal(context.calls.length, 1);
});

test('clock rollback cannot extend the original deadline', async (t) => {
  const context = fixture(t);
  const guard = context.guard();
  await guard.capture();
  context.setTime(99);
  await assert.rejects(guard.finalize(), (error) => error.reason === 'invalid-observation-clock');
});

test('replacement owned directory cannot authorize termination', async (t) => {
  const context = fixture(t);
  const guard = context.guard();
  await guard.capture();
  fs.renameSync(context.dependencies, `${context.dependencies}-original`);
  fs.mkdirSync(context.dependencies);
  fs.writeFileSync(context.executable, '');
  await assert.rejects(guard.finalize(), (error) => error.reason === 'owned-root-identity-changed');
  assert.equal(
    context.calls.some((call) => call.kind === 'terminate'),
    false
  );
});

test('prefix sibling is not owned executable scope', async (t) => {
  const context = fixture(t);
  const sibling = `${context.dependencies}-foreign`;
  fs.mkdirSync(sibling);
  const executable = path.join(sibling, 'runtime.exe');
  fs.writeFileSync(executable, '');
  context.setTable([context.owner, context.ancestor, { ...context.child, executable }]);
  await assert.rejects(context.guard().capture(), (error) => error.reason === 'missing-live-owned-process-observation');
});

test('capture and finalization are once-only operations', async (t) => {
  const context = fixture(t);
  const guard = context.guard();
  await assert.rejects(guard.finalize(), (error) => error.reason === 'missing-live-owned-process-observation');
  await assert.rejects(guard.capture(), (error) => error.reason === 'duplicate-process-capture');
  const second = context.guard();
  await second.capture();
  await assert.rejects(second.capture(), (error) => error.reason === 'duplicate-process-capture');
  await second.finalize();
  await assert.rejects(second.finalize(), (error) => error.reason === 'duplicate-process-finalization');
  const failedCapture = context.guard();
  await assert.rejects(failedCapture.capture(), (error) => error.reason === 'missing-live-owned-process-observation');
  await assert.rejects(failedCapture.capture(), (error) => error.reason === 'duplicate-process-capture');
});

test('an owner descendant with an unavailable executable cannot disappear from ownership observation', async (t) => {
  const context = fixture(t);
  context.setTable([context.owner, context.ancestor, context.child, { ...context.child, pid: 104, executable: '' }]);
  await assert.rejects(context.guard().capture(), (error) => error.reason === 'missing-process-identity');
  assert.equal(
    context.calls.some((call) => call.kind === 'terminate'),
    false
  );
});

for (const platform of ['linux', 'win32']) {
  test(`${platform}: a current parent PID created after its child cannot authorize initial ancestry`, async (t) => {
    const context = fixture(t, platform);
    context.setTable([context.owner, { ...context.ancestor, creationIdentity: context.creationIdentity(400) }, context.child]);
    await assert.rejects(context.guard().capture(), (error) => error.reason === 'reused-process-ancestor');
    assert.equal(
      context.calls.some((call) => call.kind === 'terminate'),
      false
    );
  });

  test(`${platform}: malformed ancestry creation time cannot authorize ownership`, async (t) => {
    const context = fixture(t, platform);
    context.setTable([context.owner, { ...context.ancestor, creationIdentity: 'unproven-time' }, context.child]);
    await assert.rejects(context.guard().capture(), (error) => error.reason === 'unproven-process-creation-order');
    assert.equal(
      context.calls.some((call) => call.kind === 'terminate'),
      false
    );
  });
}
