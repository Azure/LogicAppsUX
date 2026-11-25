import * as assert from 'node:assert/strict';
import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FuncIdentity {
  pid: number;
  birth: string;
  executable: string;
  sha256: string;
  parentPid?: number;
}

export interface ProcessLineage {
  pid: number;
  birth: string;
  parentPid: number;
}

export interface Population {
  complete: true;
  processes: FuncIdentity[];
  lineage?: ProcessLineage[];
}

export interface StablePopulation extends Population {
  stability: { samples: number; durationMs: number; acceptedAt: number };
}

export class PopulationRace extends Error {}

export interface PopulationProvider {
  snapshot(budgetMs: number): Promise<Population>;
}

// Observations only. Partial rows, path matches and parent PIDs never establish
// ownership or admission. The observer must not change collection or errors.
export interface PopulationCollectionReceipt {
  complete: boolean;
  nativePasses: number;
  totalRows: number;
  inspectedRows: number;
  processes: FuncIdentity[];
  parents: Array<{ pid: number; parentPid: number }>;
  procProbe?: ProcProbeReceipt;
  procFault?: ProcProbeReceipt;
  windowsProbe?: WindowsPopulationProbe;
  windowsFirstProbe?: WindowsPopulationProbe;
  budgetMs?: number;
  remainingMs?: number;
  durationMs?: number;
  collectionStageCode?: number;
  error?: unknown;
}
export type PopulationReceiptSink = (receipt: PopulationCollectionReceipt) => void;

export interface WindowsPopulationProbe {
  pass: number;
  budgetMs: number;
  durationMs: number;
  remainingMs: number;
  // 0=no script marker, 1=script entry, 2=CIM returned, 3=projection
  // finished, 4=JSON serialized, 5=stdout write finished.
  stageCode: number;
  startupMs?: number;
  cimMs?: number;
  projectionMs?: number;
  serializationMs?: number;
  respondMs?: number;
}

// Existing owning reads only; no extra enumeration, stat, argv or executable
// probes. Codes: boot=1, enumerate=2, stat=3, comm=4, exe-link=5,
// cmdline=6, executable-bytes=7. State is the Linux stat state character code.
// Errors: ENOENT=1, EACCES=2, EPERM=3, other=4. Zero means no IO error.
export interface ProcProbeReceipt {
  pid: number;
  operationCode: number;
  stateCode: number | null;
  birth?: string;
  errorCode: number;
}

function observedProcFiles(files: ProcFiles, root: string, receipt: PopulationCollectionReceipt): ProcFiles {
  const errorCodes: Record<string, number> = { ENOENT: 1, EACCES: 2, EPERM: 3 };
  const readCodes: Record<string, number> = { stat: 3, comm: 4, cmdline: 6 };
  let current: ProcProbeReceipt | undefined;
  function record(file: string, operationCode: number, value?: unknown, error?: unknown) {
    try {
      const component = path.relative(root, file).split(path.sep)[0];
      const pid = /^[1-9]\d*$/.test(component) ? Number(component) : 0;
      const probe: ProcProbeReceipt = {
        ...(current?.pid === pid ? current : { pid, stateCode: null }),
        operationCode,
        errorCode: error ? (errorCodes[String((error as NodeJS.ErrnoException).code)] ?? 4) : 0,
      };
      if (!error && operationCode === 3 && typeof value === 'string') {
        const fields = value
          .slice(value.lastIndexOf(') ') + 2)
          .trim()
          .split(/\s+/);
        probe.stateCode = fields[0]?.length === 1 ? fields[0].charCodeAt(0) : null;
        // Only the already-read start tick; never retain stat text or comm.
        probe.birth = /^\d+$/.test(fields[19] ?? '') ? fields[19] : undefined;
      }
      current = probe;
      receipt.procProbe = probe;
      if (error) {
        receipt.procFault = probe;
      }
    } catch {
      // Observation must never replace a primary filesystem result/error.
    }
  }
  function probe<T>(file: string, operationCode: number, body: () => T): T {
    let value: T;
    try {
      value = body();
    } catch (error) {
      record(file, operationCode, undefined, error);
      throw error;
    }
    record(file, operationCode, value);
    return value;
  }
  return {
    readdir: (file) => probe(file, 2, () => files.readdir(file)),
    read: (file) => probe(file, readCodes[path.basename(file)] ?? 1, () => files.read(file)),
    readlink: (file) => probe(file, 5, () => files.readlink(file)),
    binary: (file) => probe(file, 7, () => files.binary(file)),
  };
}

function observedCollection(
  collect: (receipt: PopulationCollectionReceipt, budgetMs: number) => Promise<Population>,
  sink?: PopulationReceiptSink,
  now = Date.now
): PopulationProvider {
  return {
    async snapshot(budgetMs) {
      const started = now();
      const receipt: PopulationCollectionReceipt = {
        complete: false,
        nativePasses: 0,
        totalRows: 0,
        inspectedRows: 0,
        processes: [],
        parents: [],
      };
      try {
        const population = await collect(receipt, budgetMs);
        receipt.complete = true;
        return population;
      } catch (error) {
        receipt.error = error;
        throw error;
      } finally {
        try {
          receipt.budgetMs = budgetMs;
          receipt.durationMs = now() - started;
          receipt.remainingMs = budgetMs - receipt.durationMs;
          sink?.(receipt);
        } catch {
          // Secondary diagnostics must preserve the original verdict/error.
        }
      }
    },
  };
}

export function remainingBudget(deadline: number, now = Date.now()): number {
  const remaining = Math.floor(deadline - now);
  assert.ok(remaining > 0, 'Multi-root observation deadline exhausted');
  return remaining;
}

export function isFunc(name: string): boolean {
  return /^func(?:\.exe)?$/i.test(name);
}

export function fingerprint(population: Population): string {
  assert.equal(population.complete, true, 'Partial process populations cannot establish the source count');
  const seen = new Set<number>();
  for (const record of population.processes) {
    assert.ok(Number.isSafeInteger(record.pid) && record.pid > 0 && !seen.has(record.pid), 'Invalid or duplicate process identity');
    seen.add(record.pid);
    assert.ok(record.birth && path.isAbsolute(record.executable) && /^[a-f0-9]{64}$/.test(record.sha256), 'Unverifiable func identity');
    assert.ok(isFunc(path.basename(record.executable)), 'Wrong binary in func population');
  }
  return JSON.stringify([...population.processes].sort((a, b) => a.pid - b.pid));
}

// This is the global executable population, NOT one selected process per root,
// NOT a task/PID list, NOT dotnet workers, and NOT a cleanup/ownership protocol.
export async function waitForFuncPopulation(
  provider: PopulationProvider,
  options: { logicAppCount: number; executable: string; sha256: string; deadline: number; stableMs?: number },
  clock = { now: Date.now, pause: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }
): Promise<StablePopulation> {
  assert.ok(Number.isSafeInteger(options.logicAppCount) && options.logicAppCount >= 2, 'A complete multi-root Logic App count is required');
  assert.ok(path.isAbsolute(options.executable) && /^[a-f0-9]{64}$/.test(options.sha256), 'Admitted func binary identity is required');
  const stableMs = options.stableMs ?? 1500;
  assert.ok(stableMs > 0, 'Population stability must be observed over time');
  let previous: string | undefined;
  let stableSince = clock.now();
  let samples = 0;
  while (remainingBudget(options.deadline, clock.now())) {
    let population: Population;
    try {
      population = await provider.snapshot(remainingBudget(options.deadline, clock.now()));
    } catch (error) {
      if (!(error instanceof PopulationRace)) {
        throw error; // Permissions, inaccessible executable, parse errors are never absence.
      }
      previous = undefined;
      samples = 0;
      await clock.pause(Math.min(250, remainingBudget(options.deadline, clock.now())));
      continue;
    }
    remainingBudget(options.deadline, clock.now()); // A late successful RPC cannot pass.
    const current = fingerprint(population);
    for (const record of population.processes) {
      assert.equal(record.executable, options.executable, 'Unrelated/wrong func executable in complete population');
      assert.equal(record.sha256, options.sha256, 'Func binary changed or wrong binary was counted');
    }
    if (population.processes.length !== options.logicAppCount || previous !== current) {
      stableSince = clock.now();
      samples = 0;
    }
    previous = current;
    samples++;
    if (population.processes.length === options.logicAppCount && samples >= 3 && clock.now() - stableSince >= stableMs) {
      return { ...population, stability: { samples, durationMs: clock.now() - stableSince, acceptedAt: clock.now() } };
    }
    await clock.pause(Math.min(250, remainingBudget(options.deadline, clock.now())));
  }
  throw new Error('Complete func population did not settle to the Logic App count');
}

export interface ProcFiles {
  readdir(root: string): string[];
  read(file: string): string;
  readlink(file: string): string;
  binary(file: string): Buffer;
}

const nativeProcFiles: ProcFiles = {
  readdir: (root) => fs.readdirSync(root),
  read: (file) => fs.readFileSync(file, 'utf8'),
  readlink: (file) => fs.readlinkSync(file),
  binary: (file) => fs.readFileSync(file),
};

export function procBirth(stat: string, boot: string): string {
  const end = stat.lastIndexOf(') ');
  assert.ok(end > 0, 'Malformed proc identity');
  const fields = stat
    .slice(end + 2)
    .trim()
    .split(/\s+/);
  assert.ok(/^\d+$/.test(fields[19] ?? '') && boot, 'Missing proc creation identity');
  return `${boot}:${fields[19]}`;
}

function procKernelThread(stat: string): boolean {
  const fields = stat
    .slice(stat.lastIndexOf(') ') + 2)
    .trim()
    .split(/\s+/);
  assert.ok(/^\d+$/.test(fields[6] ?? ''), 'Missing proc flags');
  // Linux PF_KTHREAD is kernel-owned; an empty argv alone also occurs during
  // userspace exit and cannot prove an executable-free kernel thread.
  return (BigInt(fields[6]) & 0x00200000n) !== 0n;
}

export function createLinuxPopulationProvider(files = nativeProcFiles, root = '/proc', sink?: PopulationReceiptSink): PopulationProvider {
  return observedCollection(async (receipt, budgetMs) => {
    // This adapter is local to this collector/invocation, never a global fs hook.
    const procFiles = observedProcFiles(files, root, receipt);
    const deadline = Date.now() + budgetMs;
    const boot = procFiles.read(path.join(root, 'sys/kernel/random/boot_id')).trim();
    const enumerate = () =>
      procFiles
        .readdir(root)
        .filter((name) => /^[1-9]\d*$/.test(name))
        .sort();
    const initial = enumerate();
    receipt.nativePasses++;
    receipt.totalRows = initial.length;
    const processes: FuncIdentity[] = [];
    const lineage: ProcessLineage[] = [];
    receipt.processes = processes;
    const exclusions: Array<() => void> = [];
    try {
      for (const pid of initial) {
        receipt.inspectedRows++;
        remainingBudget(deadline);
        const dir = path.join(root, pid);
        const firstStat = procFiles.read(path.join(dir, 'stat'));
        const first = procBirth(firstStat, boot);
        const parentPid = Number(
          firstStat
            .slice(firstStat.lastIndexOf(') ') + 2)
            .trim()
            .split(/\s+/)[1]
        );
        assert.ok(Number.isSafeInteger(parentPid) && parentPid >= 0, 'Unverifiable native parent');
        lineage.push({ pid: Number(pid), birth: first, parentPid });
        // Reading every comm is necessary: an unreadable row might itself be func.
        const name = procFiles.read(path.join(dir, 'comm')).trim();
        assert.ok(name, 'Missing process name can conceal func population');
        const verifyIdentity = () => {
          remainingBudget(deadline);
          const stat = procFiles.read(path.join(dir, 'stat'));
          const currentParent = Number(
            stat
              .slice(stat.lastIndexOf(') ') + 2)
              .trim()
              .split(/\s+/)[1]
          );
          if (first !== procBirth(stat, boot) || parentPid !== currentParent || name !== procFiles.read(path.join(dir, 'comm')).trim()) {
            throw new PopulationRace('Process identity/name changed during collection');
          }
          return stat;
        };
        let executable: string;
        try {
          executable = procFiles.readlink(path.join(dir, 'exe'));
        } catch (error) {
          const denied = error instanceof Error && 'code' in error && (error.code === 'EACCES' || error.code === 'EPERM');
          const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
          // A zombie has already exited and has no executable/argv. It may
          // remain in /proc until its parent reaps it; retrying that stable row
          // forever prevents any complete live executable population.
          const zombie = (stat: string) => stat.slice(stat.lastIndexOf(') ') + 2).split(/\s+/)[0] === 'Z';
          if (missing && zombie(firstStat)) {
            const verifyZombie = () => {
              const stat = verifyIdentity();
              if (!zombie(stat)) {
                throw new PopulationRace('Zombie state changed during collection');
              }
              assert.equal(procFiles.read(path.join(dir, 'cmdline')), '', 'Zombie unexpectedly has userspace arguments');
              try {
                procFiles.readlink(path.join(dir, 'exe'));
              } catch (absent) {
                if (absent instanceof Error && 'code' in absent && absent.code === 'ENOENT') {
                  return;
                }
                throw absent; // Access denial is not executable absence.
              }
              throw new PopulationRace('Zombie executable reappeared during collection');
            };
            verifyZombie();
            exclusions.push(verifyZombie); // Recheck identity/state/absence at the final pass.
            continue;
          }
          if ((denied || missing) && !isFunc(name) && procKernelThread(firstStat)) {
            const verifyKernelThread = () => {
              verifyIdentity();
              assert.equal(procFiles.read(path.join(dir, 'cmdline')), '', 'Kernel thread unexpectedly has userspace arguments');
              if (!procKernelThread(procFiles.read(path.join(dir, 'stat')))) {
                throw new PopulationRace('Kernel-thread identity changed during collection');
              }
            };
            verifyKernelThread();
            exclusions.push(verifyKernelThread);
            continue;
          }
          // proc exe links use ptrace permissions, unlike comm/cmdline. A
          // system-owned non-Func (e.g. PID 1) must not require elevation.
          // Never drop a denied Func candidate, an unreadable name/argv, or
          // an unclassifiable row. Inspect argv[0] only, never retain/log a
          // command line; this also catches Func with a renamed comm.
          if (denied && !isFunc(name)) {
            const readArgv0 = () => {
              const commandLine = procFiles.read(path.join(dir, 'cmdline'));
              const end = commandLine.indexOf('\0');
              assert.ok(end > 0, 'Denied executable has no classifiable process argv[0]');
              return commandLine.slice(0, end);
            };
            const argv0 = readArgv0();
            if (isFunc(path.posix.basename(argv0))) {
              throw error;
            }
            const verifyExclusion = () => {
              verifyIdentity();
              if (readArgv0() !== argv0) {
                throw new PopulationRace('Denied non-Func process changed during collection');
              }
            };
            verifyExclusion();
            exclusions.push(verifyExclusion);
            continue;
          }
          if (!missing || isFunc(name)) {
            throw error;
          }
          throw new PopulationRace('Executable missing from a userspace process');
        }
        if (!isFunc(name) && !isFunc(path.basename(executable))) {
          exclusions.push(() => {
            verifyIdentity();
            if (procFiles.readlink(path.join(dir, 'exe')) !== executable) {
              throw new PopulationRace('Non-Func executable changed during collection');
            }
          });
          continue;
        }
        const bytes = procFiles.binary(path.join(dir, 'exe'));
        if (Number.isSafeInteger(parentPid) && parentPid >= 0) {
          receipt.parents.push({ pid: Number(pid), parentPid });
        }
        const last = procBirth(procFiles.read(path.join(dir, 'stat')), boot);
        if (first !== last || executable !== procFiles.readlink(path.join(dir, 'exe'))) {
          throw new PopulationRace('PID/executable changed during collection');
        }
        processes.push({ pid: Number(pid), birth: first, executable, sha256: createHash('sha256').update(bytes).digest('hex'), parentPid });
        exclusions.push(() => {
          verifyIdentity();
          if (procFiles.readlink(path.join(dir, 'exe')) !== executable) {
            throw new PopulationRace('Func executable changed at final native pass');
          }
        });
      }
      for (const verify of exclusions) {
        verify();
      }
      const final = enumerate();
      receipt.nativePasses++;
      if (JSON.stringify(initial) !== JSON.stringify(final)) {
        throw new PopulationRace('Process table changed during collection');
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new PopulationRace('Process disappeared during full enumeration');
      }
      throw error;
    }
    remainingBudget(deadline);
    return { complete: true, processes, lineage };
  }, sink);
}

export interface WindowsProcessRow {
  pid: number;
  name: string;
  birth: string;
  executable: string;
  parentPid?: number;
}

// Numeric-only markers share the owning RPC's pipe so partial stdout survives
// execFileSync ETIMEDOUT. No second query, sidecar or diagnostic process scan.
// The CIM query remains unfiltered; projection/JSON/output get separate timings.
export const windowsPopulationScript = [
  "$ErrorActionPreference='Stop'",
  '$watch=[Diagnostics.Stopwatch]::StartNew()',
  "function Mark([int]$stage) { [Console]::Out.WriteLine(('LA_MR_POP:{0}:{1}:{2}' -f $stage,[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(),$watch.ElapsedMilliseconds)) }",
  'Mark 1',
  '$native=@(Get-CimInstance Win32_Process -ErrorAction Stop)',
  'Mark 2',
  "$rows=@($native | ForEach-Object { [ordered]@{pid=[long]$_.ProcessId; parentPid=[long]$_.ParentProcessId; name=[string]$_.Name; birth=$(if($_.CreationDate){$_.CreationDate.ToUniversalTime().Ticks.ToString()}else{''}); executable=[string]$_.ExecutablePath} })",
  'Mark 3',
  '$json=ConvertTo-Json -InputObject $rows -Compress',
  'Mark 4',
  '[Console]::Out.WriteLine($json)',
  'Mark 5',
].join('; ');

function observeWindowsOutput(output: string, probe: WindowsPopulationProbe, started: number): string {
  let previousMs = 0;
  return output
    .split(/\r?\n/)
    .filter((line) => {
      const match = /^LA_MR_POP:([1-5]):(\d{1,16}):(\d{1,12})$/.exec(line);
      if (!match) {
        return true;
      }
      const stage = Number(match[1]);
      const elapsed = Number(match[3]);
      if (stage === probe.stageCode + 1 && elapsed >= previousMs) {
        probe.stageCode = stage;
        if (stage === 1) {
          // Includes PowerShell startup and command parse, not a CIM duration.
          probe.startupMs = Number(match[2]) - started - elapsed;
        } else {
          const field = (['cimMs', 'projectionMs', 'serializationMs', 'respondMs'] as const)[stage - 2];
          probe[field] = elapsed - previousMs;
        }
        previousMs = elapsed;
      }
      return false;
    })
    .join('\n');
}

export type WindowsPopulationExecute = (file: string, args: readonly string[], options: ExecFileSyncOptionsWithStringEncoding) => string;

export function executeWindowsPopulation(
  budgetMs: number,
  probe?: WindowsPopulationProbe,
  execute: WindowsPopulationExecute = execFileSync,
  now = Date.now
): string {
  const started = now();
  const observation = probe ?? { pass: 0, budgetMs, durationMs: 0, remainingMs: budgetMs, stageCode: 0 };
  try {
    const output = execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsPopulationScript], {
      encoding: 'utf8',
      timeout: budgetMs,
      maxBuffer: 8 * 1024 * 1024,
    });
    return observeWindowsOutput(String(output), observation, started);
  } catch (error) {
    try {
      const partial = (error as { stdout?: unknown }).stdout;
      if (typeof partial === 'string' || Buffer.isBuffer(partial)) {
        observeWindowsOutput(String(partial), observation, started);
      }
    } catch {
      // Partial-output observation must preserve the exact native error.
    }
    throw error;
  } finally {
    observation.durationMs = now() - started;
    observation.remainingMs = budgetMs - observation.durationMs;
  }
}

export function parseWindowsPopulation(output: string): WindowsProcessRow[] {
  const rows: unknown = JSON.parse(output.replace(/^\uFEFF/, ''));
  assert.ok(Array.isArray(rows), 'Malformed/incomplete native process table');
  const seen = new Set<number>();
  return rows.flatMap((value: unknown) => {
    assert.ok(value && typeof value === 'object', 'Malformed process row');
    const row = value as Partial<WindowsProcessRow>;
    const pid = row.pid;
    assert.ok(typeof pid === 'number' && Number.isSafeInteger(pid) && pid >= 0 && !seen.has(pid), 'Duplicate/missing native PID');
    seen.add(pid);
    assert.ok(typeof row.name === 'string' && row.name, 'Missing name can conceal func population');
    const candidate = isFunc(row.name) || (typeof row.executable === 'string' && isFunc(path.win32.basename(row.executable)));
    if (!candidate) {
      return [];
    }
    assert.ok(pid > 0 && row.birth && /^\d+$/.test(row.birth), 'Func creation identity unavailable');
    assert.ok(row.executable && path.win32.isAbsolute(row.executable), 'Func executable inaccessible; check native permissions');
    return [row as WindowsProcessRow];
  });
}

export function createWindowsPopulationProvider(
  execute: (budgetMs: number, probe?: WindowsPopulationProbe) => string = executeWindowsPopulation,
  binary = (file: string) => fs.readFileSync(file),
  canonical = (file: string) => fs.realpathSync(file),
  sink?: PopulationReceiptSink,
  now = Date.now
): PopulationProvider {
  return observedCollection(
    async (receipt, budgetMs) => {
      const deadline = now() + budgetMs;
      const remaining = () => remainingBudget(deadline, now());
      const query = (pass: number) => {
        const budget = remaining();
        const started = now();
        const probe: WindowsPopulationProbe = { pass, budgetMs: budget, durationMs: 0, remainingMs: budget, stageCode: 0 };
        receipt.windowsProbe = probe;
        if (pass === 1) {
          receipt.windowsFirstProbe = probe;
        }
        try {
          return execute(budget, probe);
        } finally {
          probe.durationMs = now() - started;
          probe.remainingMs = deadline - now();
        }
      };
      // Collection stage: first native=1, parse=2, hash=3, second native=4,
      // parse=5, rehash=6, lineage=7, complete=8.
      receipt.collectionStageCode = 1;
      const first = query(1);
      receipt.nativePasses++;
      receipt.collectionStageCode = 2;
      const table: unknown = JSON.parse(first.replace(/^\uFEFF/, ''));
      receipt.totalRows = Array.isArray(table) ? table.length : 0;
      const before = parseWindowsPopulation(first).sort((a, b) => a.pid - b.pid);
      const processes = receipt.processes;
      receipt.collectionStageCode = 3;
      for (const row of before) {
        receipt.inspectedRows++;
        remaining();
        if (typeof row.parentPid === 'number' && Number.isSafeInteger(row.parentPid) && row.parentPid >= 0) {
          receipt.parents.push({ pid: row.pid, parentPid: row.parentPid });
        }
        processes.push({
          pid: row.pid,
          birth: row.birth,
          executable: canonical(row.executable),
          sha256: createHash('sha256').update(binary(row.executable)).digest('hex'),
          parentPid: row.parentPid,
        });
      }
      receipt.collectionStageCode = 4;
      const final = query(2);
      receipt.collectionStageCode = 5;
      const after = parseWindowsPopulation(final).sort((a, b) => a.pid - b.pid);
      receipt.nativePasses++;
      const identities = (rows: WindowsProcessRow[]) =>
        rows.map(({ pid, name, birth, executable, parentPid }) => ({ pid, name, birth, executable, parentPid }));
      if (JSON.stringify(identities(before)) !== JSON.stringify(identities(after))) {
        throw new PopulationRace('Native func population/PID identity changed while hashing');
      }
      receipt.collectionStageCode = 6;
      for (const record of processes) {
        remaining();
        assert.equal(createHash('sha256').update(binary(record.executable)).digest('hex'), record.sha256, 'Func executable race');
      }
      remaining();
      // Only native rows identical at both passes can form an ancestry bridge.
      // Missing/inaccessible non-Func rows are not absence or ownership credit.
      receipt.collectionStageCode = 7;
      const finalTable = JSON.parse(final.replace(/^\uFEFF/, '')) as WindowsProcessRow[];
      const lineage: ProcessLineage[] = (table as WindowsProcessRow[]).flatMap((row) => {
        if (
          !Number.isSafeInteger(row.pid) ||
          row.pid <= 0 ||
          !/^\d+$/.test(row.birth || '') ||
          !Number.isSafeInteger(row.parentPid) ||
          row.parentPid! < 0
        ) {
          return [];
        }
        const match = finalTable.filter((last) => last.pid === row.pid);
        return match.length === 1 && match[0].birth === row.birth && match[0].parentPid === row.parentPid
          ? [{ pid: row.pid, birth: row.birth, parentPid: row.parentPid! }]
          : [];
      });
      receipt.collectionStageCode = 8;
      return { complete: true, processes, lineage };
    },
    sink,
    now
  );
}

export function nativePopulationProvider(platform = process.platform, sink?: PopulationReceiptSink): PopulationProvider {
  assert.ok(platform === 'win32' || platform === 'linux', 'Multi-root native population requires Windows or Linux');
  return platform === 'win32'
    ? createWindowsPopulationProvider(undefined, undefined, undefined, sink)
    : createLinuxPopulationProvider(undefined, undefined, sink);
}
