import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { createDiagnosticProducer } from '../../../scripts/e2e-cli-diagnostics';
import type { BootstrapBinary } from './workspaceMultiRootBootstrap';
import { PopulationRace, type Population } from './workspaceMultiRootCollector';
import { readDesignTimeOwners, verifyRootPairs, waitForOwnedFuncPopulation, type DesignTimeOwner } from './workspaceMultiRootOwnership';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function fixture() {
  const file = path.resolve('unit-native-runtime', process.platform === 'win32' ? 'func.exe' : 'func');
  const binary: BootstrapBinary = { executable: file, sha256: 'a'.repeat(64), stamp: { dev: 1, ino: 1, size: 1, mtimeMs: 1 } };
  const worker = { ...binary, executable: path.join(path.dirname(file), 'in-proc8', path.basename(file)) };
  const host = { pid: 1, birthSha256: hash('boot:1') };
  const owners: DesignTimeOwner[] = [10, 20, 30].map((pid) => ({
    projectSha256: hash(`root-${pid}`),
    host: { ...host },
    shell: { pid, birthSha256: hash(`boot:${pid}`) },
  }));
  const population: Population = {
    complete: true,
    processes: owners.flatMap((o) => [
      {
        pid: o.shell.pid + 1,
        birth: `boot:${o.shell.pid + 1}`,
        executable: binary.executable,
        sha256: binary.sha256,
        parentPid: o.shell.pid,
      },
      {
        pid: o.shell.pid + 2,
        birth: `boot:${o.shell.pid + 2}`,
        executable: worker.executable,
        sha256: worker.sha256,
        parentPid: o.shell.pid + 1,
      },
    ]),
    lineage: [
      { pid: 1, birth: 'boot:1', parentPid: 999 },
      ...owners.flatMap((o) => [
        { pid: o.shell.pid, birth: `boot:${o.shell.pid}`, parentPid: 1 },
        { pid: o.shell.pid + 1, birth: `boot:${o.shell.pid + 1}`, parentPid: o.shell.pid },
        { pid: o.shell.pid + 2, birth: `boot:${o.shell.pid + 2}`, parentPid: o.shell.pid + 1 },
      ]),
    ],
  };
  return { binary, worker, owners, population };
}
test('real two-role model credits three native current-root pairs, not six logical roots', () => {
  const f = fixture();
  const pairs = verifyRootPairs(f.population, f.owners, f.binary, f.worker)!;
  assert.equal(pairs.length, 3);
  assert.deepEqual(
    pairs.map((p) => p.launcherPid),
    [11, 21, 31]
  );
  assert.deepEqual(
    pairs.map((p) => p.workerPid),
    [12, 22, 32]
  );
  assert.equal(f.binary.sha256, f.worker.sha256, 'Identical apphost bytes must still have distinct exact role paths');
});
for (const condition of [
  'extra-pair',
  'wrong-path',
  'wrong-worker-bytes',
  'reused-shell',
  'reused-host',
  'foreign-parent',
  'missing-lineage',
  'duplicate-lineage',
  'duplicate-root',
  'duplicate-shell',
  'mixed-host',
  'shared-worker',
  'parent-younger',
  'wrong-boot',
  'partial',
]) {
  test(`strict native root bijection rejects ${condition}`, () => {
    const f = fixture();
    const p = f.population;
    if (condition === 'extra-pair') {
      p.processes.push({ ...p.processes[0], pid: 100 }, { ...p.processes[1], pid: 101, parentPid: 100 });
      p.lineage!.push({ pid: 100, birth: 'boot:11', parentPid: 10 }, { pid: 101, birth: 'boot:12', parentPid: 100 });
    }
    if (condition === 'wrong-path') {
      p.processes[1].executable = path.resolve('foreign', path.basename(f.worker.executable));
    }
    if (condition === 'wrong-worker-bytes') {
      p.processes[1].sha256 = 'b'.repeat(64);
    }
    if (condition === 'reused-shell') {
      p.lineage!.find((r) => r.pid === 10)!.birth = 'boot:10000';
    }
    if (condition === 'reused-host') {
      p.lineage![0].birth = 'boot:10000';
    }
    if (condition === 'foreign-parent') {
      p.lineage!.find((r) => r.pid === 10)!.parentPid = 999;
    }
    if (condition === 'missing-lineage') {
      delete p.lineage;
    }
    if (condition === 'duplicate-lineage') {
      p.lineage!.push({ ...p.lineage![0] });
    }
    if (condition === 'duplicate-root') {
      f.owners[1].projectSha256 = f.owners[0].projectSha256;
    }
    if (condition === 'duplicate-shell') {
      f.owners[1].shell = { ...f.owners[0].shell };
    }
    if (condition === 'mixed-host') {
      f.owners[1].host.birthSha256 = hash('another-host');
    }
    if (condition === 'shared-worker') {
      p.processes[3].parentPid = p.processes[0].pid;
      p.lineage!.find((r) => r.pid === p.processes[3].pid)!.parentPid = p.processes[0].pid;
    }
    if (condition === 'parent-younger') {
      p.processes[0].birth = 'boot:1000';
      p.lineage!.find((r) => r.pid === 11)!.birth = 'boot:1000';
    }
    if (condition === 'wrong-boot') {
      p.processes[1].birth = 'foreign:12';
      p.lineage!.find((r) => r.pid === 12)!.birth = 'foreign:12';
    }
    if (condition === 'partial') {
      (p as unknown as { complete: boolean }).complete = false;
    }
    assert.throws(() => verifyRootPairs(p, f.owners, f.binary, f.worker), condition);
  });
}
test('missing worker is pending, never accepted as a launcher-only population', () => {
  const f = fixture();
  f.population.processes.pop();
  assert.equal(verifyRootPairs(f.population, f.owners, f.binary, f.worker), undefined);
});
test('strict root-pair stability waits for actual startup within the unchanged budget', async () => {
  const f = fixture();
  let now = 0;
  let calls = 0;
  const result = await waitForOwnedFuncPopulation(
    { snapshot: async () => f.population },
    {
      ...f,
      logicAppCount: 3,
      owners: () => (++calls < 3 ? undefined : f.owners),
      deadline: 3000,
      stableMs: 500,
    },
    {
      now: () => now,
      pause: async (ms) => {
        now += ms;
      },
    }
  );
  assert.equal(result.ownership.length, 3);
  assert.ok(calls >= 5 && result.stability.durationMs >= 500);
});
test('only actual population races can be retried; access errors remain the primary error', async () => {
  const f = fixture();
  const failure = Object.assign(new Error('private-denied'), { code: 'EACCES' });
  await assert.rejects(
    waitForOwnedFuncPopulation(
      {
        snapshot: async () => {
          throw failure;
        },
      },
      {
        ...f,
        logicAppCount: 3,
        owners: () => f.owners,
        deadline: Date.now() + 1000,
      }
    ),
    (error) => error === failure
  );
  let now = 0;
  let calls = 0;
  const result = await waitForOwnedFuncPopulation(
    {
      snapshot: async () => {
        if (++calls === 1) {
          throw new PopulationRace('changed');
        }
        return f.population;
      },
    },
    { ...f, logicAppCount: 3, owners: () => f.owners, deadline: 3000, stableMs: 500 },
    {
      now: () => now,
      pause: async (ms) => {
        now += ms;
      },
    }
  );
  assert.ok(result.stability.samples >= 3);
});
test('a late successful ownership read cannot extend the native population deadline', async () => {
  const f = fixture();
  let now = 0;
  await assert.rejects(
    waitForOwnedFuncPopulation(
      { snapshot: async () => f.population },
      {
        ...f,
        logicAppCount: 3,
        owners: () => {
          now = 4000;
          return f.owners;
        },
        deadline: 3000,
      },
      {
        now: () => now,
        pause: async (ms) => {
          now += ms;
        },
      }
    ),
    /deadline/
  );
});

function journalFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'native-root-journal-'));
  const root = fs.realpathSync.native(directory);
  const roots = [path.join(root, 'a'), path.join(root, 'b')];
  for (const project of roots) {
    fs.mkdirSync(path.join(project, 'workflow-designtime'), { recursive: true });
  }
  const file = path.join(root, 'source-bound.design-time.jsonl');
  const expected = {
    source: 'a'.repeat(40),
    run: '42',
    invocation: '11111111-1111-1111-1111-111111111111',
    hostPid: 1,
    hostBirthSha256: hash('boot:1'),
    roots,
  };
  const records: string[] = [];
  const producer = createDiagnosticProducer({
    producer: 'native-design-time',
    binding: {
      sourceSha: expected.source,
      run: expected.run,
      nativeInvocation: expected.invocation,
    },
    sink: (line) => {
      records.push(line);
      fs.appendFileSync(file, line);
    },
  });
  for (const [index, project] of roots.entries()) {
    const pid = 10 + index * 10;
    producer.emit('design-time-spawn-native-binding', 'end', {
      state: {
        hostPid: 1,
        pid,
        project,
        workingDirectory: path.join(project, 'workflow-designtime'),
        spawnIdentityProven: true,
        ancestryProven: true,
        workspaceProven: true,
        processes: [
          { pid: 1, birth: 'boot:1', parentPid: 999 },
          { pid, birth: `boot:${pid}`, parentPid: 1 },
        ],
      },
    });
    producer.emit('design-time-startup', 'end', {
      state: {
        hostPid: 1,
        pid,
        project,
        processPresent: true,
        startupPromisePresent: false,
        settled: true,
      },
    });
  }
  return { root, roots, file, expected, records };
}
test('real serialized ownership journal joins current activation birth, original spawn and actual startup', () => {
  const f = journalFixture();
  try {
    const owners = readDesignTimeOwners(f.file, f.expected)!;
    assert.equal(owners.length, 2);
    assert.equal(owners[0].shell.birthSha256, hash('boot:10'));
    assert.ok(!fs.readFileSync(f.file, 'utf8').includes(f.root));
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
for (const condition of [
  'wrong-source',
  'wrong-run',
  'wrong-invocation',
  'old-host-birth',
  'missing-startup',
  'failed-startup',
  'pending-startup',
  'unproven-binding',
  'async-only',
  'wrong-project',
  'duplicate-native-birth',
]) {
  test(`serialized root ownership cannot credit ${condition}`, () => {
    const f = journalFixture();
    try {
      const rows = f.records.map((line) => JSON.parse(line));
      switch (condition) {
        case 'wrong-source':
          rows[0].sourceSha = 'b'.repeat(40);
          break;
        case 'wrong-run':
          rows[0].run = '43';
          break;
        case 'wrong-invocation':
          rows[0].nativeInvocation = 'foreign';
          break;
        case 'old-host-birth':
          f.expected.hostBirthSha256 = hash('old-host');
          break;
        case 'missing-startup':
          rows.splice(1, 1);
          break;
        case 'failed-startup':
          rows[1].status = 'failure';
          break;
        case 'pending-startup':
          rows[1].state.startupPromisePresent = true;
          break;
        case 'unproven-binding':
          rows[0].state.spawnIdentityProven = false;
          break;
        case 'async-only':
          rows[0].operation = 'design-time-spawn-native-identity';
          break;
        case 'wrong-project':
          rows[0].state.project.sha256 = hash('unrelated-root');
          break;
        case 'duplicate-native-birth':
          rows[0].state.processes.items[1] = rows[0].state.processes.items[0];
          break;
      }
      fs.writeFileSync(f.file, `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`);
      if (['missing-startup', 'async-only', 'wrong-project'].includes(condition)) {
        assert.equal(readDesignTimeOwners(f.file, f.expected), undefined);
      } else {
        assert.throws(() => readDesignTimeOwners(f.file, f.expected));
      }
    } finally {
      fs.rmSync(f.root, { recursive: true, force: true });
    }
  });
}
