/* global require, Buffer, __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createDiagnosticProducer,
  diagnosticBinding,
  diagnosticState,
  diagnosticError,
  diagnosticOperationId,
  observeFileOperation,
  writeFileWithDiagnostics,
  relayObserverDiagnostics,
  getFuncDiagnosticProducer,
  getDesignTimeDiagnosticProducer,
} = require('./e2e-cli-diagnostics');

test('design-time admission fails closed without diagnostic IO for every incomplete native tuple', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-design-admission-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = {
    LA_E2E_CLI_MULTI_ROOT_ISOLATED: '1',
    LA_E2E_LIFECYCLE_DIR: root,
    LA_E2E_LIFECYCLE_INVOCATION: require('node:crypto').randomUUID(),
    LA_E2E_CLI_MULTI_ROOT_EVENTS: path.join(root, 'debug-events.jsonl'),
  };
  const lstat = fs.lstatSync;
  const append = fs.appendFileSync;
  let io = 0;
  fs.lstatSync = fs.appendFileSync = () => {
    io++;
    throw new Error('must not inspect');
  };
  try {
    for (const key of Object.keys(env)) {
      const partial = { ...env };
      delete partial[key];
      assert.equal(getDesignTimeDiagnosticProducer(partial), undefined, key);
    }
    for (const overrides of [
      { LA_E2E_CLI_MULTI_ROOT_ISOLATED: '0' },
      { LA_E2E_LIFECYCLE_DIR: 'relative' },
      { LA_E2E_LIFECYCLE_INVOCATION: '../escape' },
      { LA_E2E_CLI_MULTI_ROOT_EVENTS: 'debug-events.jsonl' },
      { LA_E2E_CLI_MULTI_ROOT_EVENTS: path.join(root, 'other.jsonl') },
    ])
      assert.equal(getDesignTimeDiagnosticProducer({ ...env, ...overrides }), undefined);
    assert.equal(io, 0);
  } finally {
    fs.lstatSync = lstat;
    fs.appendFileSync = append;
  }
  assert.equal(getDesignTimeDiagnosticProducer({ ...env, LA_E2E_LIFECYCLE_DIR: path.join(root, 'absent') }), undefined);
  assert.deepEqual(fs.readdirSync(root), []);
});

test('real design-time serializer and separate relay retain owner identity and static operations, never raw values', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-design-owner-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const invocation = require('node:crypto').randomUUID();
  const env = {
    LA_E2E_CLI_MULTI_ROOT_ISOLATED: '1',
    LA_E2E_LIFECYCLE_DIR: root,
    LA_E2E_LIFECYCLE_INVOCATION: invocation,
    LA_E2E_CLI_MULTI_ROOT_EVENTS: path.join(root, 'debug-events.jsonl'),
  };
  // Regular windows need no VSCODE_RUNNING_TESTS flag.
  const trace = getDesignTimeDiagnosticProducer(env);
  assert.ok(trace);
  assert.equal(getDesignTimeDiagnosticProducer(env), trace);
  const state = {
    hostPid: 20274,
    pid: 23035,
    targetPid: 23080,
    childFuncPid: 23080,
    project: 'D:\\private\\project-secret',
    workingDirectory: 'D:\\private\\workdir-secret',
    command: 'private-executable --token=command-secret',
    argvCount: 3,
    shell: true,
    mapCount: 3,
    startupPromisePresent: true,
    processPresent: true,
    retry: 0,
    reused: false,
    skipped: false,
    settled: false,
    fulfilledCount: 2,
    rejectedCount: 1,
    env: { TOKEN: 'env-secret' },
    args: ['args-secret'],
    arbitraryState: 'unadmitted-secret',
  };
  const operations = [
    'design-time-start-request',
    'design-time-map-set',
    'design-time-startup',
    'design-time-spawn',
    'design-time-process-map-set',
    'design-time-child-pid-set',
    'design-time-map-delete',
    'design-time-stop-all',
    'design-time-stop',
    'design-time-tracked-stop',
    'design-time-kill',
    'design-time-taskkill',
  ];
  for (const operation of operations) {
    assert.equal(diagnosticOperationId(operation), operation);
    assert.equal(diagnosticOperationId(`${operation}.secret`), null);
    trace.start(operation, state).end(state);
  }
  // A reloaded owner module has a different producer identity, including when
  // the containing process is reused. Real hosts additionally supply hostPid.
  const modulePath = require.resolve('./e2e-cli-diagnostics');
  const cached = require.cache[modulePath];
  delete require.cache[modulePath];
  try {
    const reload = require('./e2e-cli-diagnostics').getDesignTimeDiagnosticProducer(env);
    reload.start('design-time-spawn', { ...state, hostPid: 23500, pid: 23538, targetPid: 23581 }).end({ hostPid: 23500 });
  } finally {
    require.cache[modulePath] = cached;
  }
  const file = path.join(root, `${invocation}.design-time.jsonl`);
  const native = fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.equal(native.length, 26);
  assert.equal(new Set(native.slice(0, 24).map((record) => record.producerId)).size, 1);
  assert.notEqual(native[0].producerId, native[24].producerId);
  assert.equal(native[24].state.hostPid, 23500);
  const expected = { ...state };
  for (const key of ['project', 'workingDirectory', 'command']) {
    expected[key] = {
      sha256: require('node:crypto').createHash('sha256').update(state[key]).digest('hex'),
      length: state[key].length,
      capped: false,
    };
  }
  for (const key of ['env', 'args', 'arbitraryState']) delete expected[key];
  assert.deepEqual(native[0].state, expected);
  fs.appendFileSync(file, `${JSON.stringify({ ...native[0], operation: 'func-map-set' })}\n`);
  fs.appendFileSync(file, `${JSON.stringify({ ...native[0], operation: 'design-time-spawn.private-command' })}\n`);
  fs.writeFileSync(path.join(root, `${invocation}.observer.jsonl`), `${JSON.stringify(native[0])}\n`);
  const relayed = [];
  const parent = createDiagnosticProducer({ maxEvents: 4, sink: (line) => relayed.push(JSON.parse(line)) });
  for (let count = 0; count < 10; count++) parent.emit('native-launch', 'sample');
  relayObserverDiagnostics(root, parent);
  const receipts = relayed.filter((r) => r.producer === 'native-design-time-relay');
  assert.equal(receipts.length, 26, 'design-time fork is independent of the exhausted parent budget');
  for (let index = 0; index < 24; index++) {
    assert.equal(receipts[index].operation, native[index].operation);
    assert.equal(receipts[index].state.lastState.hostPid, state.hostPid);
    assert.equal(receipts[index].state.lastState.targetPid, state.targetPid);
    assert.equal(receipts[index].state.lastState.startupPromisePresent, true);
    assert.equal(receipts[index].state.lastState.mapCount, 3);
    assert.equal(receipts[index].state.lastState.project.sha256, expected.project.sha256);
    assert.equal(
      receipts[index].state.originProducer.sha256,
      require('node:crypto').createHash('sha256').update(native[index].producerId).digest('hex')
    );
  }
  assert.equal(receipts[24].state.lastState.hostPid, 23500);
  assert.equal(receipts[24].state.lastState.pid, 23538);
  assert.notEqual(receipts[0].state.originProducer.sha256, receipts[24].state.originProducer.sha256);
  const all = JSON.stringify({ native, relayed });
  for (const value of ['project-secret', 'workdir-secret', 'command-secret', 'env-secret', 'args-secret', 'unadmitted-secret']) {
    assert.ok(!all.includes(value), value);
  }
});

test('design-time producer caps and append failures remain secondary, including a full invocation file', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-design-cap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = {
    LA_E2E_CLI_MULTI_ROOT_ISOLATED: '1',
    LA_E2E_LIFECYCLE_DIR: root,
    LA_E2E_LIFECYCLE_INVOCATION: require('node:crypto').randomUUID(),
    LA_E2E_CLI_MULTI_ROOT_EVENTS: path.join(root, 'debug-events.jsonl'),
  };
  const trace = getDesignTimeDiagnosticProducer(env);
  for (let count = 0; count < 1000; count++) {
    trace.emit('design-time-spawn', 'failure', { state: { hostPid: 123, count }, error: new Error('token-secret') });
  }
  const file = path.join(root, `${env.LA_E2E_LIFECYCLE_INVOCATION}.design-time.jsonl`);
  assert.ok(fs.statSync(file).size <= 98304);
  const records = fs.readFileSync(file, 'utf8').trim().split('\n');
  assert.ok(records.length <= 128);
  assert.ok(records.length > 0);
  // A new module/host producer cannot grow an already full invocation stream.
  fs.writeFileSync(file, Buffer.alloc(98304, 32));
  const modulePath = require.resolve('./e2e-cli-diagnostics');
  const cached = require.cache[modulePath];
  delete require.cache[modulePath];
  try {
    const reload = require('./e2e-cli-diagnostics').getDesignTimeDiagnosticProducer(env);
    assert.doesNotThrow(() => reload.start('design-time-spawn', { hostPid: 456 }).fail(undefined));
    assert.equal(fs.statSync(file).size, 98304);
    fs.rmSync(file);
    fs.mkdirSync(file);
    assert.doesNotThrow(() => reload.start('design-time-kill').fail(new Error('secondary')));
  } finally {
    require.cache[modulePath] = cached;
  }
});

test('startup serialization admits only explicit fields, preserving boolean meaning and hashing strings', () => {
  const records = [];
  const trace = createDiagnosticProducer({ sink: (line) => records.push(JSON.parse(line)) });
  const matches = { apiId: true, workspace: true, launch: false, invocation: true, name: true, type: true, request: true };
  trace.emit('debug-startup-session', 'observed', {
    state: {
      launchId: 'private-launch',
      requireHostRunning: true,
      launchPending: true,
      launchStarted: false,
      launchRejected: false,
      liveOwnedSessions: 0,
      settled: false,
      started: false,
      matches,
      arbitraryState: 'must-not-survive',
    },
  });
  const state = records[0].state;
  assert.deepEqual(state.matches, matches);
  for (const key of ['requireHostRunning', 'launchPending', 'launchStarted', 'launchRejected', 'liveOwnedSessions', 'settled', 'started']) {
    assert.ok(Object.hasOwn(state, key), key);
  }
  assert.match(state.launchId.sha256, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(records).includes('private-launch'));
  assert.ok(!Object.hasOwn(state, 'arbitraryState'));
  for (const operation of ['debug-startup', 'debug-startup-launch', 'debug-startup-session']) {
    assert.equal(diagnosticOperationId(operation), operation);
    assert.equal(diagnosticOperationId(`${operation}.private-value`), null);
  }
});

test('func owner admission has no output outside test diagnostic mode, and separate caps survive relay', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-func-owner-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const invocation = require('node:crypto').randomUUID();
  const env = {
    VSCODE_RUNNING_TESTS: '1',
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'msn-weather-run',
    LA_E2E_CLI_MSN_DIAGNOSTICS_DIR: root,
    LA_E2E_LIFECYCLE_DIR: root,
    LA_E2E_LIFECYCLE_INVOCATION: invocation,
  };
  for (const key of Object.keys(env)) {
    const partial = { ...env };
    delete partial[key];
    assert.equal(getFuncDiagnosticProducer('events', partial), undefined);
  }
  assert.deepEqual(fs.readdirSync(root), []);
  const events = getFuncDiagnosticProducer('events', env);
  const startup = getFuncDiagnosticProducer('startup', env);
  assert.notEqual(events, startup);
  for (let count = 0; count < 1000; count++) events.emit('func-task-start-event', 'sample', { state: { count } });
  startup.start('func-task-execute', { workspace: 'private-workspace' }).end({ trackedPid: 123, childCount: 0 });
  const waiting = startup.start('func-wait-map', { found: false, mapCount: 0 });
  waiting.fail(undefined, { found: false, timeout: true });
  const eventFile = path.join(root, `${invocation}.func-events.jsonl`);
  assert.ok(fs.statSync(eventFile).size <= 65536);
  assert.ok(fs.readFileSync(eventFile, 'utf8').trim().split('\n').length <= 96);
  const relayed = [];
  const trace = createDiagnosticProducer({ sink: (line) => relayed.push(JSON.parse(line)), maxEvents: 8 });
  for (let count = 0; count < 100; count++) trace.emit('wait-predicate', 'sample');
  relayObserverDiagnostics(root, trace);
  const startupReceipts = relayed.filter((r) => r.producer === 'native-func-startup-relay');
  assert.deepEqual(
    startupReceipts.map((r) => [r.operation, r.status]),
    [
      ['func-task-execute', 'start'],
      ['func-task-execute', 'end'],
      ['func-wait-map', 'start'],
      ['func-wait-map', 'failure'],
    ]
  );
  assert.equal(startupReceipts.at(-1).state.lastState.timeout, true);
  assert.deepEqual(startupReceipts[0].state.originOperation, startupReceipts[1].state.originOperation);
  assert.ok(!JSON.stringify(relayed).includes('private-workspace'));
});

test('func diagnostic append failure stays secondary and never creates missing directories', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-func-sink-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const trace = getFuncDiagnosticProducer('startup', {
    VSCODE_RUNNING_TESTS: '1',
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'msn-weather-run',
    LA_E2E_CLI_MSN_DIAGNOSTICS_DIR: root,
    LA_E2E_LIFECYCLE_DIR: path.join(root, 'absent'),
    LA_E2E_LIFECYCLE_INVOCATION: require('node:crypto').randomUUID(),
  });
  assert.doesNotThrow(() => trace.start('func-task-execute').fail(undefined));
  assert.deepEqual(fs.readdirSync(root), []);
});

test('actual CDP operation names survive summaries while arbitrary expressions remain hash-redacted', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/test/e2e/cdpDiagnostics.ts'), 'utf8');
  const methods = [...source.match(/const methods = new Set\(\[([\s\S]*?)\]\);/)[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const events = [...source.match(/type Event =([\s\S]*?);/)[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  for (const event of events) {
    for (const method of [...methods, 'other', 'none']) {
      const operation = `cdp-${event}.${method}.1.42`;
      assert.equal(diagnosticOperationId(operation), operation);
    }
  }
  const records = [];
  const trace = createDiagnosticProducer({ sink: (line) => records.push(JSON.parse(line)) });
  trace.emit('cdp-response.Runtime.evaluate.1.42', 'end');
  trace.emit('cdp-timeout.Runtime.evaluate.1.43', 'failure');
  trace.summary('failed', 'unknown');
  assert.equal(diagnosticOperationId(records.at(-1).lastGood), 'cdp-response.Runtime.evaluate.1.42');
  assert.equal(diagnosticOperationId(records.at(-1).firstFailedGate), 'cdp-timeout.Runtime.evaluate.1.43');
  const expression = 'document.querySelector("private-customer-value").textContent';
  for (const operation of [
    expression,
    `cdp-response.${expression}.1.42`,
    'cdp-response.Runtime.privateMethod.1.42',
    'cdp-private-event.Runtime.evaluate.1.42',
    'cdp-response.Runtime.evaluate.1.expression',
    'multi-root-population.1.42',
  ]) {
    assert.equal(diagnosticOperationId(operation), null);
  }
  trace.emit(expression, 'failure', { state: { text: expression } });
  assert.match(records.at(-1).operation, /^[a-f0-9]{64}$/);
  assert.match(records.at(-1).state.text.sha256, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(records).includes(expression));
});

test('correlated producer sequence and monotonic spans preserve parent ordering', async () => {
  const records = [];
  const trace = createDiagnosticProducer({
    sink: (line) => records.push(JSON.parse(line)),
    binding: {
      sourceSha: 'a'.repeat(40),
      run: '123',
      suite: 'unitTests',
      phase: 'control',
      nativeInvocation: 'native-1',
      parent: 'native-0',
    },
  });
  const parent = trace.start('outer');
  await trace.run('inner', () => 42, undefined, parent.id);
  parent.end();
  trace.summary('passed', 'unknown');
  assert.deepEqual(
    records.map((record) => record.sequence),
    [1, 2, 3, 4, 5]
  );
  assert.equal(records[2].parentOperation, parent.id);
  assert.equal(records[1].operationId, records[2].operationId);
  assert.ok(records[2].durationMs >= 0);
  assert.ok(records.every((record, index) => !index || record.monotonicMs >= records[index - 1].monotonicMs));
  assert.ok(records.every((record) => record.sourceSha === 'a'.repeat(40) && record.run === '123'));
  assert.equal(records[4].lastGood, 'outer');
});

test('first failed gate and last good remain observations, separate from body/harness', async () => {
  const records = [];
  const trace = createDiagnosticProducer({ sink: (line) => records.push(JSON.parse(line)) });
  await trace.run('body-step', () => {});
  const primary = new assert.AssertionError({ message: 'primary assertion' });
  await assert.rejects(
    trace.run('native-close', () => {
      throw primary;
    }),
    (error) => error === primary
  );
  await assert.rejects(
    trace.run('staging', () => {
      throw new Error('secondary');
    })
  );
  trace.summary('passed', 'failed');
  const summary = records.at(-1);
  assert.equal(summary.firstFailedGate, 'native-close');
  assert.equal(summary.lastGood, 'body-step');
  assert.equal(summary.body, 'passed');
  assert.equal(summary.harness, 'failed');
});

test('primary assertion survives a throwing secondary telemetry sink, including error getters', async () => {
  const trace = createDiagnosticProducer({
    sink: () => {
      throw new Error('telemetry disk failure');
    },
  });
  const primary = new assert.AssertionError({ message: 'keep exact object' });
  await assert.rejects(
    trace.run('assertion', () => {
      throw primary;
    }),
    (error) => error === primary
  );
  const hostile = {
    get stack() {
      throw new Error('getter failure');
    },
    get name() {
      throw new Error('getter failure');
    },
  };
  await assert.rejects(
    trace.run('hostile', () => {
      throw hostile;
    }),
    (error) => error === hostile
  );
  assert.doesNotThrow(() => trace.summary('failed', 'unknown'));
});

test('event and byte caps are hard bounds even on repeated failure', () => {
  for (const limits of [{ maxEvents: 3 }, { maxBytes: 900 }]) {
    const lines = [];
    const trace = createDiagnosticProducer({ ...limits, sink: (line) => lines.push(line) });
    for (let index = 0; index < 1000; index++)
      trace.emit('same-operation', 'failure', { state: { roots: Array(100).fill('x'.repeat(100000)) } });
    assert.ok(lines.length <= (limits.maxEvents ?? 256));
    assert.ok(lines.reduce((size, line) => size + Buffer.byteLength(line), 0) <= (limits.maxBytes ?? 262144));
  }
});

test('late first failure and summary remain visible after routine telemetry exhausts its allowance', () => {
  const records = [];
  const trace = createDiagnosticProducer({ sink: (line) => records.push(JSON.parse(line)), maxEvents: 8 });
  for (let index = 0; index < 100; index++) trace.emit('wait-predicate', 'end');
  trace.start('original-product-deactivate').fail(new Error('late primary failure'));
  trace.summary('passed', 'failed');
  assert.ok(records.length <= 8);
  assert.equal(records.at(-1).status, 'summary');
  assert.equal(records.at(-1).firstFailedGate, 'original-product-deactivate');
  assert.ok(records.at(-1).dropped > 0);
});

test('dynamic state, stack, code content, paths and credentials are hash-only and capped', () => {
  const secrets = ['Bearer private-token', 'D:\\customer\\workspace\\private.ts', 'customer-id-42', 'function privateCode() {}'];
  const serialized = JSON.stringify(diagnosticState({ text: secrets.join(' '), roots: Array(40).fill(secrets[1]), environment: secrets }));
  for (const secret of secrets) assert.ok(!serialized.includes(secret));
  assert.ok(!serialized.includes('environment'));
  const state = diagnosticState('x'.repeat(5000));
  assert.equal(state.capped, true);
  assert.equal(state.length, 5000);
  const error = diagnosticError(Object.assign(new SyntaxError(secrets.join(' ')), { code: 'ERR_INVALID_ARG_VALUE' }));
  assert.equal(error.name, 'SyntaxError');
  assert.equal(error.code, 'ERR_INVALID_ARG_VALUE');
  for (const secret of secrets) assert.ok(!JSON.stringify(error).includes(secret));
  assert.equal(diagnosticError({ code: 'private-token', name: 'private-code' }).code, null);
});

test('binding selects identity only, with invalid SHA/run omitted', () => {
  const binding = diagnosticBinding({
    BUILD_SOURCEVERSION: 'private',
    BUILD_BUILDID: 'private',
    GH_TOKEN: 'secret',
    CUSTOMER_ID: 'private',
  });
  assert.equal(binding.sourceSha, null);
  assert.equal(binding.run, null);
  assert.ok(!JSON.stringify(binding).includes('secret'));
});

test('writer hook absent returns the original promise unchanged and does no diagnostic writes', () => {
  const original = Promise.resolve('result');
  assert.equal(
    observeFileOperation('D:\\owned\\.gitignore', 'writer', 'writeFile', () => original, {}),
    original
  );
});

test('unadmitted owning adapter is never called and original promise remains unchanged', () => {
  const original = Promise.resolve();
  for (const env of [{}, { VSCODE_RUNNING_TESTS: '1' }, { LA_E2E_CLI_REGENERATION_WRITER_EVENTS: 'unused' }]) {
    assert.equal(
      observeFileOperation(
        'D:\\owned\\.gitignore',
        'removeFromGitIgnore',
        'gitignore-writeFile',
        () => original,
        env,
        () => {
          assert.fail('Unadmitted owning adapter must not run');
        }
      ),
      original
    );
  }
});

test('copyFile API receipts retain exact before/after bytecounts/hash, not internal syscall claims', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-writer-control-'));
  try {
    const file = path.join(root, '.gitignore');
    const output = path.join(root, 'writer.jsonl');
    const env = { VSCODE_RUNNING_TESTS: '1', LA_E2E_CLI_REGENERATION_WRITER_EVENTS: output };
    fs.writeFileSync(file, 'before-private');
    const template = path.join(root, 'template');
    fs.writeFileSync(template, 'after-private');
    await observeFileOperation(file, 'CreateLogicAppWorkspace', 'gitignore-copyFile', () => fs.promises.copyFile(template, file), env);
    const text = fs.readFileSync(output, 'utf8');
    const [before, after] = text.trim().split('\n').map(JSON.parse);
    assert.equal(before.state.bytes, 14);
    assert.equal(after.state.bytes, 13);
    assert.match(after.state.sha256, /^[a-f0-9]{64}$/);
    assert.notEqual(before.state.sha256, after.state.sha256);
    assert.equal(before.operationId, after.operationId);
    assert.equal(before.operation, 'gitignore-copyFile');
    assert.deepEqual(fs.readFileSync(file), fs.readFileSync(template));
    assert.ok(!text.includes(root) && !text.includes('private'));
    const originalBytes = fs.readFileSync(output);
    await observeFileOperation(path.join(root, 'other.json'), 'known-writer', 'gitignore-writeFile', () => {}, env);
    assert.deepEqual(fs.readFileSync(output), originalBytes);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('admitted owner observes real empty-before-write, writes exact UTF-8 bytes and closes with correlated receipts', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-owning-write-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, '.gitignore');
  fs.writeFileSync(file, 'old-private-content');
  const content = 'new-private-π\r\n';
  const records = [];
  let emptyDuringWrite = false;
  const env = {
    VSCODE_RUNNING_TESTS: '1',
    LA_E2E_CLI_REGENERATION_WRITER_EVENTS: path.join(root, 'writer.jsonl'),
    BUILD_SOURCEVERSION: 'a'.repeat(40),
    BUILD_BUILDID: '123',
    LA_E2E_CLI_SUITE_ID: 'workspaceArtifactRegeneration',
    LA_E2E_CLI_DIAGNOSTIC_PHASE: 'control',
    LA_E2E_LIFECYCLE_INVOCATION: 'native-1',
    LA_E2E_LIFECYCLE_PARENT_INVOCATION: 'native-0',
  };
  await observeFileOperation(
    file,
    'removeFromGitIgnore',
    'gitignore-writeFile',
    () => assert.fail('Admitted owner must use the owning adapter'),
    env,
    (trace, parent) =>
      writeFileWithDiagnostics(file, content, trace, parent, {
        async open(...args) {
          const handle = await fs.promises.open(...args);
          return {
            async write(...writeArgs) {
              // Detection at the real first write boundary: no sleep, watcher
              // inference, extra truncation or changed native-suite assertion.
              assert.equal(fs.readFileSync(file).length, 0);
              emptyDuringWrite = true;
              return handle.write(...writeArgs);
            },
            close: () => handle.close(),
          };
        },
      })
  );
  records.push(...fs.readFileSync(env.LA_E2E_CLI_REGENERATION_WRITER_EVENTS, 'utf8').trim().split('\n').map(JSON.parse));
  assert.ok(emptyDuringWrite);
  assert.deepEqual(fs.readFileSync(file), Buffer.from(content));
  assert.deepEqual(
    records.map((record) => [record.operation, record.status]),
    [
      ['gitignore-writeFile', 'start'],
      ['gitignore-open-w-create-truncate', 'start'],
      ['gitignore-open-w-create-truncate', 'end'],
      ['gitignore-write', 'start'],
      ['gitignore-write', 'end'],
      ['gitignore-close', 'start'],
      ['gitignore-close', 'end'],
      ['gitignore-writeFile', 'end'],
    ]
  );
  assert.equal(records[2].state.bytes, 0);
  const hash = require('node:crypto').createHash('sha256').update(Buffer.from(content)).digest('hex');
  assert.equal(records[4].state.bytes, Buffer.byteLength(content));
  assert.equal(records[4].state.sha256, hash);
  assert.equal(records[6].state.sha256, hash);
  for (const [index, record] of records.entries()) {
    assert.equal(record.sequence, index + 1);
    assert.equal(record.producer, 'removeFromGitIgnore');
    assert.equal(record.producerId, records[0].producerId);
    assert.equal(record.sourceSha, env.BUILD_SOURCEVERSION);
    assert.equal(record.run, '123');
    assert.equal(record.suite, 'workspaceArtifactRegeneration');
    assert.equal(record.phase, 'control');
    assert.equal(record.nativeInvocation, 'native-1');
    assert.equal(record.parent, 'native-0');
    assert.ok(Number.isFinite(Date.parse(record.wallTime)));
    assert.ok(index === 0 || record.monotonicMs >= records[index - 1].monotonicMs);
    if (index > 0 && index < 7) assert.equal(record.parentOperation, records[0].operationId);
  }
  const serialized = JSON.stringify(records);
  assert.ok(!serialized.includes(root) && !serialized.includes('private'));
});

test('owning adapter continues actual partial writes and preserves existing mode and bytes', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-partial-write-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, '.gitignore');
  fs.writeFileSync(file, 'before', { mode: 0o600 });
  const mode = fs.statSync(file).mode;
  const records = [];
  const trace = createDiagnosticProducer({ sink: (line) => records.push(JSON.parse(line)) });
  let closes = 0;
  await writeFileWithDiagnostics(file, '1234567', trace, 'owner-1', {
    async open(...args) {
      const handle = await fs.promises.open(...args);
      return {
        write: (buffer, offset, length, position) => handle.write(buffer, offset, Math.min(length, 3), position),
        async close() {
          closes++;
          await handle.close();
        },
      };
    },
  });
  assert.equal(fs.readFileSync(file, 'utf8'), '1234567');
  assert.equal(fs.statSync(file).mode, mode);
  assert.equal(closes, 1);
  assert.deepEqual(
    records.filter((record) => record.operation === 'gitignore-write' && record.status === 'end').map((r) => r.state.bytes),
    [3, 3, 1]
  );
});

for (const boundary of ['open', 'write', 'close', 'write-and-close', 'write-and-sink']) {
  test(`owning ${boundary} failure retains primary identity and real close/partial-byte boundaries`, async (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-boundary-write-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const file = path.join(root, '.gitignore');
    fs.writeFileSync(file, 'unchanged');
    const primary = Object.assign(new Error('private-primary'), { code: 'EIO' });
    const secondary = new Error('private-secondary');
    const records = [];
    const trace = createDiagnosticProducer({
      sink(line) {
        records.push(JSON.parse(line));
        if (boundary === 'write-and-sink') throw secondary;
      },
    });
    let writes = 0;
    let closes = 0;
    await assert.rejects(
      writeFileWithDiagnostics(file, 'abcdef', trace, 'owner-1', {
        async open(...args) {
          if (boundary === 'open') throw primary;
          const handle = await fs.promises.open(...args);
          return {
            async write(buffer, offset, length, position) {
              writes++;
              if (boundary.startsWith('write') && writes === 2) throw primary;
              return handle.write(buffer, offset, Math.min(length, 3), position);
            },
            async close() {
              closes++;
              await handle.close();
              if (boundary === 'close') throw primary;
              if (boundary === 'write-and-close') throw secondary;
            },
          };
        },
      }),
      (error) => error === primary
    );
    assert.equal(closes, boundary === 'open' ? 0 : 1);
    assert.equal(fs.readFileSync(file, 'utf8'), boundary === 'open' ? 'unchanged' : boundary === 'close' ? 'abcdef' : 'abc');
    assert.equal(
      records.find((record) => record.status === 'failure').operation,
      `gitignore-${boundary === 'open' ? 'open-w-create-truncate' : boundary === 'close' ? 'close' : 'write'}`
    );
    assert.equal(
      records.filter((record) => record.operation === 'gitignore-close' && record.status === 'failure').length,
      ['close', 'write-and-close'].includes(boundary) ? 1 : 0
    );
  });
}

test('empty content performs real open/truncate and close only, without invented write/rename receipts', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-empty-write-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, '.gitignore');
  fs.writeFileSync(file, 'before');
  const records = [];
  const trace = createDiagnosticProducer({ sink: (line) => records.push(JSON.parse(line)) });
  await writeFileWithDiagnostics(file, '', trace, 'owner-1');
  assert.equal(fs.readFileSync(file).length, 0);
  assert.deepEqual(
    records.map((record) => record.operation),
    ['gitignore-open-w-create-truncate', 'gitignore-open-w-create-truncate', 'gitignore-close', 'gitignore-close']
  );
});

test('owning product hooks scope only the string write; native copy retains its original operation', () => {
  const git = fs.readFileSync(path.join(__dirname, '../src/app/utils/git.ts'), 'utf8');
  const workspace = fs.readFileSync(
    path.join(__dirname, '../src/app/commands/createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace.ts'),
    'utf8'
  );
  assert.match(git, /\(\) => fse\.writeFile\(gitignorePath, gitignoreContents\)/);
  assert.match(git, /\(trace, parentOperation\) => writeFileWithDiagnostics\(gitignorePath, gitignoreContents, trace, parentOperation\)/);
  assert.match(
    workspace,
    /observeFileOperation\(gitignorePath, 'CreateLogicAppWorkspace', 'gitignore-copyFile', \(\) =>\s*fse\.copyFile\(templatePath, gitignorePath\)/
  );
  assert.ok(!workspace.includes('writeFileWithDiagnostics'));
});

test('writer primary failure survives failed receipt append; diagnostics never repairs/truncates the target', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-writer-failure-'));
  try {
    const file = path.join(root, '.gitignore');
    fs.writeFileSync(file, 'unchanged');
    const env = { VSCODE_RUNNING_TESTS: '1', LA_E2E_CLI_REGENERATION_WRITER_EVENTS: root };
    const primary = new assert.AssertionError({ message: 'writer-primary' });
    await assert.rejects(
      observeFileOperation(
        file,
        'known-writer',
        'gitignore-writeFile',
        () => {
          throw primary;
        },
        env
      ),
      (error) => error === primary
    );
    assert.equal(fs.readFileSync(file, 'utf8'), 'unchanged');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('scoped native relay exports only supplemental receipts and preserves native clock observations', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-relay-control-'));
  try {
    const records = [];
    fs.writeFileSync(
      path.join(root, 'a'.repeat(36) + '.observer.jsonl'),
      [
        JSON.stringify({ kind: 'startup', workspace: 'private-root' }),
        JSON.stringify({
          kind: 'diagnostic-operation',
          operation: 'original-product-deactivate',
          status: 'failure',
          sequence: 7,
          monotonicMs: 42,
          wallTime: new Date(100).toISOString(),
          state: { text: 'private-root' },
          error: { name: 'TypeError' },
        }),
        ...['observer-installed', 'session-started', 'session-terminated'].map((status, index) =>
          JSON.stringify({
            kind: 'diagnostic-operation',
            operation: 'msn-debug-stop',
            status,
            sequence: 8 + index,
            monotonicMs: 43 + index,
            wallTime: new Date(101 + index).toISOString(),
            state: { selected: 'private-root', owned: true, matches: true },
          })
        ),
        JSON.stringify({
          kind: 'diagnostic-operation',
          operation: 'msn-task-stop',
          status: 'sample',
          sequence: 11,
          monotonicMs: 46,
          wallTime: new Date(104).toISOString(),
          state: { pid: 123, selected: 'private-root' },
        }),
      ].join('\n')
    );
    const trace = createDiagnosticProducer({ sink: (line) => records.push(JSON.parse(line)) });
    relayObserverDiagnostics(root, trace);
    assert.equal(records.length, 5);
    assert.equal(records[0].state.nativeSequence, 7);
    assert.equal(records[0].state.nativeMonotonicMs, 42);
    assert.equal(records[0].state.nativeWallTimeMs, 100);
    assert.deepEqual(
      records.slice(1).map((record) => record.status),
      ['observer-installed', 'session-started', 'session-terminated', 'sample']
    );
    assert.deepEqual(
      records.map((record) => record.state.nativeSequence),
      [7, 8, 9, 10, 11]
    );
    assert.ok(!JSON.stringify(records).includes('private-root'));
    assert.doesNotThrow(() => relayObserverDiagnostics(path.join(root, 'absent'), trace));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('owning result summary separates executed body from harness and ignores malformed telemetry', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-summary-control-'));
  try {
    const log = path.join(root, 'native.log');
    const lines = [];
    const trace = createDiagnosticProducer({ sink: (line) => lines.push(`[e2e-operation] ${line.trim()}`) });
    trace.start('msn-debug-stop').end();
    trace.start('original-product-deactivate').fail(new Error('private-credential'));
    fs.writeFileSync(log, `  1 passing (1s)\n${lines.join('\n')}\n[e2e-operation] malformed-json\n`);
    const {
      _test: { writeSingleResult },
    } = require('./summarize-e2e-cli-results');
    writeSingleResult({ label: 'unitTests', log, outDir: root, outcome: 'failure' });
    const result = JSON.parse(fs.readFileSync(path.join(root, 'unitTests.json'), 'utf8'));
    assert.equal(result.outcome, 'failure', 'Supplemental telemetry must not override the original harness outcome');
    assert.equal(result.operationDiagnostics.body, 'passed');
    assert.equal(result.operationDiagnostics.harness, 'failed');
    assert.equal(result.operationDiagnostics.firstFailedGate, 'original-product-deactivate');
    assert.equal(result.operationDiagnostics.lastGood, 'msn-debug-stop');
    assert.deepEqual(result.operationDiagnostics.checkedArtifacts, [], 'Missing native artifacts must not be fabricated');
    assert.ok(!JSON.stringify(result.operationDiagnostics).includes('private-credential'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
