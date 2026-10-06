import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test, mock } from 'node:test';
import nativeFs from 'node:fs';
import {
  bootstrapRequest,
  parseBootstrapContext,
  readBootstrapAttestation,
  snapshotBootstrapBinary,
  writeBootstrapAttestation,
  type MultiRootBootstrapContext,
} from './workspaceMultiRootBootstrap';
import {
  createLinuxPopulationProvider,
  createWindowsPopulationProvider,
  fingerprint,
  type FuncIdentity,
  isFunc,
  type Population,
  PopulationRace,
  parseWindowsPopulation,
  type ProcFiles,
  remainingBudget,
  waitForFuncPopulation,
} from './workspaceMultiRootCollector';
import {
  assertActiveWebview,
  assertMapper,
  assertReload,
  assertSequentialDebug,
  type DebugEvent,
  readLogicAppRoots,
  realReload,
  type WorkbenchState,
} from './workspaceMultiRootWorkbench';

const executable = path.resolve('func.exe');
const bytes = Buffer.from('unit-owned-func-fixture-not-an-executable');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const population = (count = 3, birth = '100'): Population => ({
  complete: true,
  processes: Array.from({ length: count }, (_, i): FuncIdentity => ({ pid: i + 100, birth, executable, sha256 })),
});
const virtualClock = () => {
  let time = 0;
  return {
    now: () => time,
    pause: async (ms: number) => {
      time += ms;
    },
    advance: (ms: number) => {
      time += ms;
    },
  };
};
const options = (count = 3) => ({ executable, sha256, logicAppCount: count, deadline: 3000, stableMs: 500 });

function bootstrapFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-bootstrap-unit-'));
  fs.mkdirSync(path.join(root, 'FuncCoreTools'));
  const executable = path.join(root, 'FuncCoreTools', process.platform === 'win32' ? 'func.exe' : 'func');
  fs.writeFileSync(executable, 'unit-owned-binary-bytes-never-executed');
  const context: MultiRootBootstrapContext = {
    suiteId: 'workspaceMultiRoot',
    invocation: 'unit-bootstrap-invocation',
    startedUtc: new Date(Date.now() - 1000).toISOString(),
    runtimeRoot: fs.realpathSync(root),
    identity: { source: 'unit-source', run: 'unit-run', job: 'unit-job', platform: process.platform },
  };
  const request = { context, file: path.join(root, 'func-bootstrap.json') };
  const phase = {
    phaseId: 'runtimeDependencyBootstrap:bootstrap',
    complete: true,
    exitCode: 0,
    signal: null,
    cleanupVerified: true,
    diagnosticsError: '',
  };
  const probes = [`configured launcher ${executable}=4.1.2`, 'in-proc8 fixture=4.1.2'];
  return { root, executable, context, request, phase, probes };
}

test('bootstrap attestation derives exact job-owned binary bytes after successful probes and phase finalization', () => {
  const f = bootstrapFixture();
  try {
    const before = snapshotBootstrapBinary(f.context, f.executable);
    writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code-version');
    const admitted = readBootstrapAttestation(f.request.file, f.context, f.phase);
    assert.deepEqual(admitted.binary, before);
    assert.equal(admitted.binary.sha256, createHash('sha256').update(fs.readFileSync(f.executable)).digest('hex'));
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('missing/failed/incomplete bootstrap phase cannot admit a Func attestation', () => {
  const f = bootstrapFixture();
  try {
    writeBootstrapAttestation(f.request, snapshotBootstrapBinary(f.context, f.executable), f.probes, 'unit-Code');
    for (const phase of [
      {},
      { ...f.phase, complete: false },
      { ...f.phase, exitCode: 1 },
      { ...f.phase, cleanupVerified: false },
      { ...f.phase, signal: 'SIGTERM' },
      { ...f.phase, diagnosticsError: 'fixture original error' },
    ]) {
      assert.throws(() => readBootstrapAttestation(f.request.file, f.context, phase), /successful finalized/);
    }
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('bootstrap attestation is bound to the current invocation, job/source and physical runtime root', () => {
  const f = bootstrapFixture();
  try {
    writeBootstrapAttestation(f.request, snapshotBootstrapBinary(f.context, f.executable), f.probes, 'unit-Code');
    assert.throws(() => readBootstrapAttestation(f.request.file, { ...f.context, invocation: 'stale' }, f.phase), /invocation/);
    assert.throws(
      () =>
        readBootstrapAttestation(
          f.request.file,
          {
            ...f.context,
            identity: { ...f.context.identity, job: 'wrong-job' },
          },
          f.phase
        ),
      /job\/source/
    );
    assert.throws(
      () => readBootstrapAttestation(f.request.file, { ...f.context, runtimeRoot: os.tmpdir() }, f.phase),
      /different dependency root/
    );
    assert.throws(() => readBootstrapAttestation(path.join(f.root, 'missing.json'), f.context, f.phase));
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('binary replacement during native probes or after bootstrap cannot be attested or admitted', () => {
  const f = bootstrapFixture();
  try {
    const before = snapshotBootstrapBinary(f.context, f.executable);
    fs.writeFileSync(f.executable, 'changed-longer-unit-fixture-binary-bytes-never-executed');
    assert.throws(() => writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code'), /changed during/);
    writeBootstrapAttestation(f.request, snapshotBootstrapBinary(f.context, f.executable), f.probes, 'unit-Code');
    fs.writeFileSync(f.executable, 'post-bootstrap-unit-fixture-replacement');
    assert.throws(() => readBootstrapAttestation(f.request.file, f.context, f.phase), /changed after/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('outside-root executable and user-home cache are not bootstrap admission', () => {
  const f = bootstrapFixture();
  try {
    const outside = path.join(f.root, 'outside-func');
    fs.writeFileSync(outside, 'unit fixture');
    assert.throws(() => snapshotBootstrapBinary(f.context, outside), /outside/);
    assert.throws(
      () => parseBootstrapContext({ ...f.context, runtimeRoot: path.join(f.root, '.azurelogicapps/dependencies') }),
      /User-home/
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('bootstrap evidence requires paired internal inputs, actual probe versions and a fresh evidence file', () => {
  const f = bootstrapFixture();
  try {
    assert.equal(bootstrapRequest({}), undefined);
    assert.throws(() => bootstrapRequest({ LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_ATTESTATION: f.request.file }), /Both/);
    assert.throws(() => bootstrapRequest({ LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_CONTEXT: JSON.stringify(f.context) }), /Both/);
    const before = snapshotBootstrapBinary(f.context, f.executable);
    assert.throws(() => writeBootstrapAttestation(f.request, before, [], 'unit-Code'), /probes/);
    writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code');
    assert.throws(() => writeBootstrapAttestation(f.request, before, f.probes, 'unit-Code'), /EEXIST/);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('bootstrap hash read permission errors and file-read races fail closed using own file fixtures', () => {
  const f = bootstrapFixture();
  try {
    const denied = mock.method(nativeFs, 'readFileSync', () => {
      throw new Error('EACCES unit fixture');
    });
    assert.throws(() => snapshotBootstrapBinary(f.context, f.executable), /EACCES/);
    denied.mock.restore();
    const raced = mock.method(nativeFs, 'readFileSync', () => {
      nativeFs.writeFileSync(f.executable, 'longer-unit-fixture-to-change-stat-during-read');
      return Buffer.from('unit-owned-race-result');
    });
    assert.throws(() => snapshotBootstrapBinary(f.context, f.executable), /changed during bootstrap hashing/);
    raced.mock.restore();
  } finally {
    mock.restoreAll();
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test('full executable count settles without attributing one process to each root', async () => {
  const result = await waitForFuncPopulation({ snapshot: async () => population() }, options(), virtualClock());
  assert.equal(result.processes.length, 3);
});
test('collector has no three-root ceiling', async () => {
  assert.equal((await waitForFuncPopulation({ snapshot: async () => population(5) }, options(5), virtualClock())).processes.length, 5);
});
test('wrong complete population count fails at the original deadline', async () => {
  await assert.rejects(waitForFuncPopulation({ snapshot: async () => population(2) }, options(), virtualClock()), /deadline/);
});
test('extra global func cannot be filtered into a passing scoped count', async () => {
  await assert.rejects(waitForFuncPopulation({ snapshot: async () => population(4) }, options(), virtualClock()), /deadline/);
});
test('permission failure is not process absence', async () => {
  await assert.rejects(
    waitForFuncPopulation(
      {
        snapshot: async () => {
          throw new Error('EACCES unit fixture');
        },
      },
      options(),
      virtualClock()
    ),
    /EACCES/
  );
});
test('incomplete population is rejected even with the correct cardinality', async () => {
  await assert.rejects(
    waitForFuncPopulation(
      { snapshot: async () => ({ ...population(), complete: false }) as unknown as Population },
      options(),
      virtualClock()
    ),
    /Partial/
  );
});
test('wrong binary identity fails instead of filtering that func out', async () => {
  const wrong = population();
  wrong.processes[0].sha256 = 'b'.repeat(64);
  await assert.rejects(waitForFuncPopulation({ snapshot: async () => wrong }, options(), virtualClock()), /wrong binary/);
});
test('unrelated executable path fails despite matching binary bytes', async () => {
  const wrong = population();
  wrong.processes[0].executable = path.resolve('other/func.exe');
  await assert.rejects(waitForFuncPopulation({ snapshot: async () => wrong }, options(), virtualClock()), /Unrelated/);
});
test('duplicate and missing native creation identities fail closed', () => {
  const duplicate = population();
  duplicate.processes[1].pid = duplicate.processes[0].pid;
  assert.throws(() => fingerprint(duplicate), /duplicate/);
  const missing = population();
  missing.processes[0].birth = '';
  assert.throws(() => fingerprint(missing), /Unverifiable/);
});
test('PID reuse resets the whole population stability interval', async () => {
  const clock = virtualClock();
  let samples = 0;
  await waitForFuncPopulation({ snapshot: async () => population(3, ++samples < 3 ? 'old' : 'new') }, options(), clock);
  assert.ok(samples >= 5 && clock.now() >= 1000);
});
test('repeated enumeration races exhaust the same deadline', async () => {
  await assert.rejects(
    waitForFuncPopulation(
      {
        snapshot: async () => {
          throw new PopulationRace('fixture race');
        },
      },
      options(),
      virtualClock()
    ),
    /deadline/
  );
});
test('late successful collection cannot outrun the deadline', async () => {
  const clock = virtualClock();
  await assert.rejects(
    waitForFuncPopulation(
      {
        snapshot: async () => {
          clock.advance(4000);
          return population();
        },
      },
      options(),
      clock
    ),
    /deadline/
  );
});
test('deadline and absent binary oracle reject before collection', async () => {
  assert.throws(() => remainingBudget(10, 10), /deadline/);
  await assert.rejects(
    waitForFuncPopulation({ snapshot: async () => population() }, { ...options(), sha256: '' }, virtualClock()),
    /binary identity/
  );
});
test('func classifier excludes dotnet and NetFx workers', () => {
  for (const name of ['dotnet', 'Microsoft.Azure.Workflows.Functions.NetFxWorker', 'func-worker', 'functions']) {
    assert.equal(isFunc(name), false);
  }
  assert.equal(isFunc('FUNC.EXE'), true);
});

const rows = [
  { pid: 10, name: 'func.exe', birth: '123', executable: 'C:\\fixture\\func.exe' },
  { pid: 11, name: 'dotnet.exe', birth: '', executable: '' },
];
test('Windows full table includes only real func executable candidates, not workers', () => {
  assert.equal(parseWindowsPopulation(JSON.stringify(rows)).length, 1);
});
test('Windows malformed/permission-hidden func rows are rejected', () => {
  for (const value of [{}, [null], [{ ...rows[0], executable: '' }], [{ ...rows[0], birth: '' }], [rows[0], rows[0]]]) {
    assert.throws(() => parseWindowsPopulation(JSON.stringify(value)));
  }
});
test('Windows native execution permission failure propagates', async () => {
  const provider = createWindowsPopulationProvider(
    () => {
      throw new Error('EPERM fixture');
    },
    () => bytes,
    () => executable
  );
  await assert.rejects(provider.snapshot(5000), /EPERM/);
});
test('Windows stale PID / population race between native scans is rejected', async () => {
  let scan = 0;
  const provider = createWindowsPopulationProvider(
    () => JSON.stringify([{ ...rows[0], birth: ++scan === 1 ? '123' : '124' }]),
    () => bytes,
    () => executable
  );
  await assert.rejects(provider.snapshot(5000), PopulationRace);
});
test('Windows binary permissions and binary replacement fail closed', async () => {
  const denied = createWindowsPopulationProvider(
    () => JSON.stringify(rows),
    () => {
      throw new Error('EACCES fixture');
    },
    () => executable
  );
  await assert.rejects(denied.snapshot(5000), /EACCES/);
  let read = 0;
  const changed = createWindowsPopulationProvider(
    () => JSON.stringify(rows),
    () => (++read === 1 ? bytes : Buffer.from('changed')),
    () => executable
  );
  await assert.rejects(changed.snapshot(5000), /executable race/);
});

const fakeStat = (birth = '42') => `100 (func name) ${['S', ...Array.from({ length: 18 }, () => '0'), birth].join(' ')}`;
function procFixture(overrides: Partial<ProcFiles> = {}): ProcFiles {
  return {
    readdir: () => ['100'],
    read: (file) => (file.endsWith('boot_id') ? 'fixture-boot' : file.endsWith('comm') ? 'func\n' : fakeStat()),
    readlink: () => executable,
    binary: () => bytes,
    ...overrides,
  };
}
test('Linux unit-owned proc files prove executable and creation identity', async () => {
  const provider = createLinuxPopulationProvider(procFixture(), '/unit-owned-proc');
  assert.equal((await provider.snapshot(5000)).processes[0].birth, 'fixture-boot:42');
});
test('Linux any unreadable process name blocks complete enumeration', async () => {
  const files = procFixture({
    read: () => {
      throw new Error('EACCES own fixture');
    },
  });
  await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), /EACCES/);
});
test('Linux process disappearing while enumerating cannot establish an empty population', async () => {
  const error = Object.assign(new Error('gone'), { code: 'ENOENT' });
  const files = procFixture({
    readlink: () => {
      throw error;
    },
  });
  await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), PopulationRace);
});
test('Linux stale PID and table population races are rejected', async () => {
  let reads = 0;
  const files = procFixture({
    read: (file) => (file.endsWith('boot_id') ? 'boot' : file.endsWith('comm') ? 'func' : fakeStat(++reads === 1 ? '42' : '43')),
  });
  await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), PopulationRace);
  let scans = 0;
  const changing = procFixture({ readdir: () => (++scans === 1 ? ['100'] : ['100', '101']) });
  await assert.rejects(createLinuxPopulationProvider(changing, '/unit-owned-proc').snapshot(5000), PopulationRace);
});

test('Linux verified executable-free kernel thread is not a func process', async () => {
  const missing = Object.assign(new Error('fixture has no executable'), { code: 'ENOENT' });
  const kernel = procFixture({
    readlink: () => {
      throw missing;
    },
    read: (file) => (file.endsWith('boot_id') ? 'boot' : file.endsWith('comm') ? 'kernel' : file.endsWith('cmdline') ? '' : fakeStat()),
  });
  assert.equal((await createLinuxPopulationProvider(kernel, '/unit-owned-proc').snapshot(5000)).processes.length, 0);
});
test('Linux inaccessible/missing userspace executable is not silently removed from the population', async () => {
  const missing = Object.assign(new Error('fixture missing executable'), { code: 'ENOENT' });
  const files = procFixture({
    readlink: () => {
      throw missing;
    },
    read: (file) =>
      file.endsWith('boot_id') ? 'boot' : file.endsWith('comm') ? 'nonfunc' : file.endsWith('cmdline') ? 'userspace-argv' : fakeStat(),
  });
  await assert.rejects(createLinuxPopulationProvider(files, '/unit-owned-proc').snapshot(5000), /userspace process/);
});

const view = (overrides: Partial<WorkbenchState> = {}): WorkbenchState => ({
  timeOrigin: 1,
  ready: true,
  roots: ['one', 'two', 'three'],
  activeTabs: ['MultiRootMap'],
  visibleWebviews: ['vscode-webview://mapper/index.html'],
  debugToolbar: false,
  ...overrides,
});
test('reload requires a new document and all original roots', () => {
  const roots = ['one', 'two', 'three'].map((name) => path.resolve(name));
  assert.throws(() => assertReload(view(), view(), roots), /Real Reload/);
  assert.throws(() => assertReload(view(), view({ timeOrigin: 2, roots: ['one'] }), roots), /lost/);
  assertReload(view(), view({ timeOrigin: 2 }), roots);
});
test('real reload helper sends one reload command and continues the same target with new contexts', async () => {
  let generation = 1;
  let reads = 0;
  const keys: Record<string, unknown>[] = [];
  const queries: string[] = [];
  const fake = {
    targetId: 'unit-window',
    get contextGeneration() {
      return generation;
    },
    async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
      if (expression.includes('timeOrigin:performance')) {
        generation = ++reads > 1 ? 2 : 1;
        return view({ timeOrigin: reads > 1 ? 2 : 1 }) as T;
      }
      return (expression.includes('return found.length') ? { x: 10, y: 20 } : true) as T;
    },
    async send(method: string, params?: Record<string, unknown>) {
      if (method === 'Input.insertText') {
        queries.push(String(params?.text));
      }
      if (method === 'Input.dispatchKeyEvent') {
        keys.push(params || {});
      }
      return {};
    },
  };
  await realReload(
    fake,
    ['one', 'two', 'three'].map((name) => path.resolve(name)),
    Date.now() + 5000
  );
  assert.deepEqual(queries, ['View: Show Explorer', 'Developer: Reload Window']);
  assert.equal(keys.length, 4);
});
test('closed reload connection is a failure, not a replacement-window reconnect', async () => {
  let reads = 0;
  const fake = {
    targetId: 'unit-original-window',
    contextGeneration: 1,
    async evaluate<T>(_context: number | undefined, expression: string): Promise<T> {
      if (expression.includes('timeOrigin:performance')) {
        if (++reads > 1) {
          throw new Error('CDP WebSocket closed');
        }
        return view() as T;
      }
      return (expression.includes('return found.length') ? { x: 10, y: 20 } : true) as T;
    },
    async send() {
      return {};
    },
  };
  await assert.rejects(realReload(fake, [path.resolve('one')], Date.now() + 5000), /WebSocket closed/);
});
test('hidden/wrong Mapper iframe and wrong active tab fail', () => {
  assert.throws(() => assertActiveWebview(view(), 'vscode-webview://designer/index.html', 'MultiRootMap'), /visible/);
  assert.throws(
    () => assertActiveWebview(view({ activeTabs: ['Create workspace'] }), 'vscode-webview://mapper/index.html', 'MultiRootMap'),
    /active editor/
  );
});
test('Mapper command discovery/title is not Mapper-open evidence', () => {
  assert.throws(() => assertMapper('Create data map', true), /Actual Data Mapper/);
  assert.throws(() => assertMapper('Source schema Target schema ENOENT', true), /failed/);
  assert.throws(() => assertMapper('Source schema Target schema', false), /did not load/);
  assertMapper('Source schema Target schema', true);
});
const debugPair = (folder: string, id: string): DebugEvent[] => [
  { kind: 'started', boot: 'reloaded', folder, id, name: 'Run logic app', type: 'coreclr' },
  { kind: 'terminated', boot: 'reloaded', folder, id, name: 'Run logic app', type: 'coreclr' },
];
test('every folder actually starts and terminates sequentially', () => {
  assertSequentialDebug([...debugPair('one', '1'), ...debugPair('two', '2')], ['one', 'two']);
});
test('overlap, wrong root, incomplete lifecycle, and wrong termination folder fail', () => {
  const a = debugPair('one', '1');
  const b = debugPair('two', '2');
  assert.throws(() => assertSequentialDebug([a[0], b[0], a[1], b[1]], ['one', 'two']), /one at a time/);
  assert.throws(() => assertSequentialDebug(debugPair('wrong', '1'), ['one']), /Wrong-folder/);
  assert.throws(() => assertSequentialDebug([a[0]], ['one']), /remained active/);
  assert.throws(() => assertSequentialDebug([a[0], { ...a[1], folder: 'two' }], ['one']), /different folder/);
  assert.throws(() => assertSequentialDebug(a, ['one', 'two']), /Every folder/);
  assert.throws(() => assertSequentialDebug([a[0], { ...a[1], boot: 'replacement' }], ['one']), /different extension host/);
  assert.throws(() => assertSequentialDebug([...a, { kind: 'activation', boot: 'replacement' }, ...b], ['one', 'two']), /replaced between/);
});
test('complete persisted root denominator rejects absent/partial/duplicate roots and has no ceiling', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-unit-'));
  try {
    const roots = Array.from({ length: 5 }, (_, i) => path.join(temp, `app-${i}`));
    for (const folder of roots) {
      fs.mkdirSync(path.join(folder, 'main'), { recursive: true });
      for (const file of ['host.json', 'local.settings.json', 'main/workflow.json']) {
        fs.writeFileSync(path.join(folder, file), '{}');
      }
    }
    const file = path.join(temp, 'fixture.code-workspace');
    const write = (folders: string[]) => fs.writeFileSync(file, JSON.stringify({ folders: folders.map((folder) => ({ path: folder })) }));
    write(roots);
    assert.equal(readLogicAppRoots(file, roots).length, 5);
    write(roots.slice(1));
    assert.throws(() => readLogicAppRoots(file, roots), /missing/);
    write([...roots, roots[0]]);
    assert.throws(() => readLogicAppRoots(file, roots), /Duplicate/);
    write(roots);
    fs.rmSync(path.join(roots[0], 'host.json'));
    assert.throws(() => readLogicAppRoots(file, roots), /Incomplete/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
