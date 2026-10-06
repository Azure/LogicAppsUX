import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FuncIdentity {
  pid: number;
  birth: string;
  executable: string;
  sha256: string;
}

export interface Population {
  complete: true;
  processes: FuncIdentity[];
}

export interface StablePopulation extends Population {
  stability: { samples: number; durationMs: number; acceptedAt: number };
}

export class PopulationRace extends Error {}

export interface PopulationProvider {
  snapshot(budgetMs: number): Promise<Population>;
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

export function createLinuxPopulationProvider(files = nativeProcFiles, root = '/proc'): PopulationProvider {
  return {
    async snapshot(budgetMs) {
      const deadline = Date.now() + budgetMs;
      const boot = files.read(path.join(root, 'sys/kernel/random/boot_id')).trim();
      const enumerate = () =>
        files
          .readdir(root)
          .filter((name) => /^[1-9]\d*$/.test(name))
          .sort();
      const initial = enumerate();
      const processes: FuncIdentity[] = [];
      try {
        for (const pid of initial) {
          remainingBudget(deadline);
          const dir = path.join(root, pid);
          // Reading every comm is necessary: an unreadable row might itself be func.
          const name = files.read(path.join(dir, 'comm')).trim();
          let executable: string;
          try {
            executable = files.readlink(path.join(dir, 'exe'));
          } catch (error) {
            // Kernel threads have no executable. Prove a still-present, unchanged
            // identity AND empty command line; do not confuse a lost PID with one.
            if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT') || isFunc(name)) {
              throw error;
            }
            const before = procBirth(files.read(path.join(dir, 'stat')), boot);
            assert.equal(files.read(path.join(dir, 'cmdline')), '', 'Executable missing from a userspace process');
            if (before !== procBirth(files.read(path.join(dir, 'stat')), boot)) {
              throw new PopulationRace('Process disappeared/reused while checking an executable-free kernel thread');
            }
            continue;
          }
          if (!isFunc(name) && !isFunc(path.basename(executable))) {
            continue;
          }
          const first = procBirth(files.read(path.join(dir, 'stat')), boot);
          const bytes = files.binary(path.join(dir, 'exe'));
          const last = procBirth(files.read(path.join(dir, 'stat')), boot);
          if (first !== last || executable !== files.readlink(path.join(dir, 'exe'))) {
            throw new PopulationRace('PID/executable changed during collection');
          }
          processes.push({ pid: Number(pid), birth: first, executable, sha256: createHash('sha256').update(bytes).digest('hex') });
        }
        if (JSON.stringify(initial) !== JSON.stringify(enumerate())) {
          throw new PopulationRace('Process table changed during collection');
        }
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          throw new PopulationRace('Process disappeared during full enumeration');
        }
        throw error;
      }
      remainingBudget(deadline);
      return { complete: true, processes };
    },
  };
}

export interface WindowsProcessRow {
  pid: number;
  name: string;
  birth: string;
  executable: string;
}

export const windowsPopulationScript =
  "$ErrorActionPreference='Stop'; $rows=@(Get-CimInstance Win32_Process -ErrorAction Stop | ForEach-Object { [ordered]@{pid=[long]$_.ProcessId; name=[string]$_.Name; birth=$(if($_.CreationDate){$_.CreationDate.ToUniversalTime().Ticks.ToString()}else{''}); executable=[string]$_.ExecutablePath} }); ConvertTo-Json -InputObject $rows -Compress";

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
  execute = (budgetMs: number) =>
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsPopulationScript], {
      encoding: 'utf8',
      timeout: budgetMs,
      maxBuffer: 8 * 1024 * 1024,
    }),
  binary = (file: string) => fs.readFileSync(file),
  canonical = (file: string) => fs.realpathSync(file)
): PopulationProvider {
  return {
    async snapshot(budgetMs) {
      const deadline = Date.now() + budgetMs;
      const before = parseWindowsPopulation(execute(remainingBudget(deadline))).sort((a, b) => a.pid - b.pid);
      const processes = before.map((row) => {
        remainingBudget(deadline);
        return {
          pid: row.pid,
          birth: row.birth,
          executable: canonical(row.executable),
          sha256: createHash('sha256').update(binary(row.executable)).digest('hex'),
        };
      });
      const after = parseWindowsPopulation(execute(remainingBudget(deadline))).sort((a, b) => a.pid - b.pid);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        throw new PopulationRace('Native func population/PID identity changed while hashing');
      }
      for (const record of processes) {
        remainingBudget(deadline);
        assert.equal(createHash('sha256').update(binary(record.executable)).digest('hex'), record.sha256, 'Func executable race');
      }
      remainingBudget(deadline);
      return { complete: true, processes };
    },
  };
}

export function nativePopulationProvider(platform = process.platform): PopulationProvider {
  assert.ok(platform === 'win32' || platform === 'linux', 'Multi-root native population requires Windows or Linux');
  return platform === 'win32' ? createWindowsPopulationProvider() : createLinuxPopulationProvider();
}
