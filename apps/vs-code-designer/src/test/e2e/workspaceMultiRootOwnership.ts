import * as assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  fingerprint,
  PopulationRace,
  remainingBudget,
  type Population,
  type PopulationProvider,
  type StablePopulation,
} from './workspaceMultiRootCollector';
import type { BootstrapBinary } from './workspaceMultiRootBootstrap';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export interface BirthBinding {
  pid: number;
  birthSha256: string;
}
export interface DesignTimeOwner {
  projectSha256: string;
  host: BirthBinding;
  shell: BirthBinding;
}
export interface CurrentActivation {
  hostPid: number;
  hostBirthSha256: string;
}
export interface RootPair {
  projectSha256: string;
  hostPid: number;
  shellPid: number;
  launcherPid: number;
  workerPid: number;
}
export interface OwnedPopulation extends StablePopulation {
  ownership: RootPair[];
}

// Reads only the exact invocation file. The asynchronous supplemental receipt
// is deliberately NOT an admission source: only the synchronous original-spawn
// binding, current recorder host birth and successful owning startup may join.
export function readDesignTimeOwners(
  file: string,
  expected: CurrentActivation & { source: string; run: string; invocation: string; roots: string[] }
): DesignTimeOwner[] | undefined {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 98304, 'Invalid native ownership receipt file');
  const text = fs.readFileSync(file, 'utf8');
  const after = fs.lstatSync(file);
  assert.ok(
    after.isFile() && !after.isSymbolicLink() && after.dev === stat.dev && after.ino === stat.ino,
    'Native ownership receipt changed identity'
  );
  assert.ok(Buffer.byteLength(text) <= 98304, 'Native ownership receipt cap exceeded');
  // An append in progress is pending, not malformed evidence. Complete records
  // must parse; no catch converts denied/malformed evidence into another try.
  const records = text
    .slice(0, text.lastIndexOf('\n') + 1)
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const current = records.filter((r) => r.state?.hostPid === expected.hostPid);
  for (const r of current) {
    assert.ok(
      r.sourceSha === expected.source &&
        String(r.run) === expected.run &&
        r.nativeInvocation === expected.invocation &&
        r.producer === 'native-design-time',
      'Foreign source/run/invocation in native ownership receipt'
    );
  }
  const owners: DesignTimeOwner[] = [];
  for (const root of expected.roots) {
    const projectSha256 = digest(fs.realpathSync.native(root));
    const bindings = current.filter(
      (r) => r.operation === 'design-time-spawn-native-binding' && r.status === 'end' && r.state.project?.sha256 === projectSha256
    );
    const binding = bindings.at(-1);
    if (!binding) {
      return undefined;
    }
    const s = binding.state;
    assert.ok(
      s.spawnIdentityProven === true &&
        s.ancestryProven === true &&
        s.workspaceProven === true &&
        s.workingDirectory?.sha256 === digest(fs.realpathSync.native(path.join(root, 'workflow-designtime'))),
      'Original physical root spawn is unproven'
    );
    assert.ok(s.processes?.count === 2 && s.processes.items?.length === 2, 'Missing original native births');
    const birth = (pid: number): BirthBinding => {
      const entries = s.processes.items.filter((r: { pid: number }) => r.pid === pid);
      assert.ok(entries.length === 1 && /^[a-f0-9]{64}$/.test(entries[0].birth?.sha256 || ''), 'Missing/duplicate original birth');
      return { pid, birthSha256: entries[0].birth.sha256 };
    };
    const host = birth(expected.hostPid);
    const shell = birth(s.pid);
    assert.equal(host.birthSha256, expected.hostBirthSha256, 'Ownership belongs to an earlier activation host birth');
    assert.equal(s.processes.items.find((r: { pid: number }) => r.pid === shell.pid).parentPid, host.pid);
    const startup = current
      .filter(
        (r) =>
          r.operation === 'design-time-startup' &&
          ['end', 'failure'].includes(r.status) &&
          r.state.project?.sha256 === projectSha256 &&
          r.producerId === binding.producerId &&
          r.sequence > binding.sequence
      )
      .at(-1);
    if (!startup) {
      return undefined;
    }
    assert.equal(startup.status, 'end', 'Actual design-time startup failed');
    assert.ok(
      startup.state.settled === true &&
        startup.state.processPresent === true &&
        startup.state.pid === shell.pid &&
        startup.state.startupPromisePresent === false,
      'Actual current-root design-time startup is not complete'
    );
    owners.push({ projectSha256, host, shell });
  }
  assert.equal(new Set(owners.map((o) => o.projectSha256)).size, expected.roots.length, 'Duplicate root ownership');
  assert.equal(new Set(owners.map((o) => o.shell.pid)).size, expected.roots.length, 'Shared shell cannot own distinct roots');
  return owners;
}

export function verifyRootPairs(
  population: Population,
  owners: DesignTimeOwner[],
  binary: BootstrapBinary,
  worker: BootstrapBinary
): RootPair[] | undefined {
  fingerprint(population);
  assert.equal(new Set(owners.map((o) => o.projectSha256)).size, owners.length, 'Duplicate physical root');
  assert.equal(new Set(owners.map((o) => o.shell.pid)).size, owners.length, 'Duplicate original shell');
  assert.equal(new Set(owners.map((o) => `${o.host.pid}:${o.host.birthSha256}`)).size, 1, 'Mixed activation hosts');
  assert.ok(population.lineage, 'Birth-bound native ancestry is required');
  const lineage = new Map(population.lineage.map((row) => [row.pid, row]));
  assert.equal(lineage.size, population.lineage.length, 'Duplicate native ancestry row');
  const launchers = population.processes.filter((r) => r.executable === binary.executable);
  const workers = population.processes.filter((r) => r.executable === worker.executable);
  for (const record of population.processes) {
    const admitted = record.executable === binary.executable ? binary : record.executable === worker.executable ? worker : undefined;
    assert.ok(admitted, 'Unrelated/wrong func executable in complete population');
    assert.equal(record.sha256, admitted.sha256, 'Func role bytes changed');
    const native = lineage.get(record.pid);
    assert.ok(native && native.birth === record.birth && native.parentPid === record.parentPid, 'Unverifiable Func native ancestry');
  }
  assert.ok(population.processes.length <= owners.length * 2, 'Extra/stale Func pair in complete global population');
  if (launchers.length !== owners.length || workers.length !== owners.length) {
    return undefined;
  }
  const checkBirth = (bound: BirthBinding) => {
    const row = lineage.get(bound.pid);
    assert.ok(row && digest(row.birth) === bound.birthSha256, 'Missing/reused original host or shell identity');
    return row;
  };
  const used = new Set<number>();
  const bornBefore = (parent: string, child: string) => {
    const a = parent.split(':');
    const b = child.split(':');
    assert.ok(
      a.length === b.length && (a.length === 1 || a[0] === b[0]) && BigInt(a.at(-1)!) <= BigInt(b.at(-1)!),
      'Native ancestor was created after its child'
    );
  };
  const pairs = owners.map((owner): RootPair => {
    checkBirth(owner.host);
    const shell = checkBirth(owner.shell);
    assert.equal(shell.parentPid, owner.host.pid, 'Original shell no longer belongs to the current host');
    bornBefore(lineage.get(owner.host.pid)!.birth, shell.birth);
    const matching = launchers.filter((launcher) => {
      let row = lineage.get(launcher.pid);
      const seen = new Set<number>();
      for (let depth = 0; row && depth < 12; depth++) {
        assert.ok(!seen.has(row.pid), 'Cyclic native ancestry');
        seen.add(row.pid);
        if (row.pid === owner.shell.pid) {
          return true;
        }
        if (row.pid === owner.host.pid) {
          return false;
        }
        const parent = lineage.get(row.parentPid);
        if (parent) {
          bornBefore(parent.birth, row.birth);
        }
        row = parent;
      }
      return false;
    });
    assert.equal(matching.length, 1, 'Each physical root requires one native owned launcher');
    const launcher = matching[0];
    const children = workers.filter((w) => w.parentPid === launcher.pid);
    assert.equal(children.length, 1, 'Each launcher requires one native worker');
    const child = children[0];
    bornBefore(launcher.birth, child.birth);
    assert.ok(!used.has(launcher.pid) && !used.has(child.pid), 'Reused launcher/worker root credit');
    used.add(launcher.pid);
    used.add(child.pid);
    return {
      projectSha256: owner.projectSha256,
      hostPid: owner.host.pid,
      shellPid: owner.shell.pid,
      launcherPid: launcher.pid,
      workerPid: child.pid,
    };
  });
  assert.equal(used.size, population.processes.length, 'Unowned Func cannot be filtered out');
  return pairs;
}

export async function waitForOwnedFuncPopulation(
  provider: PopulationProvider,
  options: {
    binary: BootstrapBinary;
    worker: BootstrapBinary;
    logicAppCount: number;
    owners: () => DesignTimeOwner[] | undefined;
    deadline: number;
    stableMs?: number;
  },
  clock = { now: Date.now, pause: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }
): Promise<OwnedPopulation> {
  assert.ok(options.logicAppCount >= 2 && Number.isSafeInteger(options.logicAppCount));
  const stableMs = options.stableMs ?? 1500;
  assert.ok(stableMs > 0, 'Population stability must be observed over time');
  assert.ok(
    path.isAbsolute(options.binary.executable) &&
      path.isAbsolute(options.worker.executable) &&
      options.binary.executable !== options.worker.executable &&
      [options.binary.sha256, options.worker.sha256].every((v) => /^[a-f0-9]{64}$/.test(v)),
    'Both exact native role identities required'
  );
  let previous: string | undefined;
  let since = clock.now();
  let samples = 0;
  while (remainingBudget(options.deadline, clock.now())) {
    let population: Population;
    try {
      population = await provider.snapshot(remainingBudget(options.deadline, clock.now()));
    } catch (error) {
      if (!(error instanceof PopulationRace)) {
        throw error;
      }
      previous = undefined;
      samples = 0;
      await clock.pause(Math.min(250, remainingBudget(options.deadline, clock.now())));
      continue;
    }
    remainingBudget(options.deadline, clock.now());
    fingerprint(population);
    for (const record of population.processes) {
      const admitted =
        record.executable === options.binary.executable
          ? options.binary
          : record.executable === options.worker.executable
            ? options.worker
            : undefined;
      assert.ok(admitted, 'Unrelated/wrong func executable in complete population');
      assert.equal(record.sha256, admitted.sha256, 'Func role bytes changed');
    }
    const owners = options.owners();
    assert.ok(!owners || owners.length === options.logicAppCount, 'Missing logical root denominator');
    const pairs = owners && verifyRootPairs(population, owners, options.binary, options.worker);
    remainingBudget(options.deadline, clock.now());
    const current = pairs ? JSON.stringify({ population: fingerprint(population), pairs }) : undefined;
    if (!current || current !== previous) {
      samples = 0;
      since = clock.now();
    }
    previous = current;
    samples++;
    if (pairs && samples >= 3 && clock.now() - since >= stableMs) {
      return { ...population, ownership: pairs, stability: { samples, durationMs: clock.now() - since, acceptedAt: clock.now() } };
    }
    await clock.pause(Math.min(250, remainingBudget(options.deadline, clock.now())));
  }
  throw new Error('Current-root launcher/worker ownership did not settle');
}
