import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface MultiRootBootstrapContext {
  suiteId: 'workspaceMultiRoot';
  invocation: string;
  startedUtc: string;
  runtimeRoot: string;
  identity: { source: string; run: string; job: string; platform: string };
}

export interface BootstrapBinary {
  executable: string;
  sha256: string;
  stamp: { dev: number; ino: number; size: number; mtimeMs: number };
}

export interface MultiRootBootstrapAttestation {
  schemaVersion: 1;
  suiteId: 'workspaceMultiRoot';
  phaseId: 'runtimeDependencyBootstrap:bootstrap';
  invocation: string;
  identity: MultiRootBootstrapContext['identity'];
  runtimeRoot: string;
  recordedUtc: string;
  vscodeVersion: string;
  probes: string[];
  binary: BootstrapBinary;
}

export function parseBootstrapContext(value: unknown): MultiRootBootstrapContext {
  assert.ok(value && typeof value === 'object', 'Missing current multi-root bootstrap context');
  const context = value as Partial<MultiRootBootstrapContext>;
  assert.equal(context.suiteId, 'workspaceMultiRoot');
  assert.ok(typeof context.invocation === 'string' && context.invocation);
  assert.ok(typeof context.startedUtc === 'string' && Number.isFinite(Date.parse(context.startedUtc)));
  assert.ok(typeof context.runtimeRoot === 'string' && path.isAbsolute(context.runtimeRoot));
  assert.ok(
    !/[/\\]\.azurelogicapps[/\\]dependencies(?:[/\\]|$)/i.test(context.runtimeRoot),
    'User-home dependency cache is not job-owned bootstrap admission'
  );
  assert.ok(
    context.identity &&
      ['source', 'run', 'job', 'platform'].every(
        (key) =>
          typeof context.identity?.[key as keyof MultiRootBootstrapContext['identity']] === 'string' &&
          context.identity[key as keyof MultiRootBootstrapContext['identity']]
      )
  );
  assert.equal(context.identity.platform, process.platform, 'Bootstrap belongs to a different native OS');
  return context as MultiRootBootstrapContext;
}

export function bootstrapRequest(env: NodeJS.ProcessEnv) {
  const file = env.LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_ATTESTATION;
  const serialized = env.LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_CONTEXT;
  if (!file && !serialized) {
    return undefined; // Other existing bootstrap callers are unchanged.
  }
  assert.ok(file && path.isAbsolute(file) && serialized, 'Both current bootstrap attestation inputs are required');
  return { file, context: parseBootstrapContext(JSON.parse(serialized)) };
}

export function snapshotBootstrapBinary(context: MultiRootBootstrapContext, configuredPath: string): BootstrapBinary {
  const root = fs.realpathSync(context.runtimeRoot);
  assert.equal(root, context.runtimeRoot, 'Job-owned dependency root changed identity');
  const expected = path.join(root, 'FuncCoreTools', process.platform === 'win32' ? 'func.exe' : 'func');
  assert.equal(path.resolve(configuredPath), expected, 'Native bootstrap resolved func outside its configured job root');
  for (const candidate of [path.join(root, 'FuncCoreTools'), expected]) {
    assert.ok(!fs.lstatSync(candidate).isSymbolicLink(), 'Native bootstrap func must not escape through a link');
  }
  const executable = fs.realpathSync(configuredPath);
  assert.equal(executable, expected, 'Native func physical identity differs from the job-owned executable');
  const before = fs.statSync(executable);
  assert.ok(before.isFile() && before.size > 0, 'Native bootstrap func is missing or empty');
  const sha256 = createHash('sha256').update(fs.readFileSync(executable)).digest('hex');
  const after = fs.statSync(executable);
  const stamp = (stat: fs.Stats) => ({ dev: stat.dev, ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs });
  assert.deepEqual(stamp(after), stamp(before), 'Native func changed during bootstrap hashing');
  return { executable, sha256, stamp: stamp(after) };
}

// Called only after the existing real --version probes AND no-dialog assertion.
// Compare with the pre-probe snapshot so a swapped executable cannot be attested.
export function writeBootstrapAttestation(
  request: { file: string; context: MultiRootBootstrapContext },
  before: BootstrapBinary,
  probes: string[],
  vscodeVersion: string
): void {
  assert.ok(
    probes.length >= 2 && probes.every((probe) => /=\d+\.\d+\.\d+/.test(probe)),
    'Successful existing native Func probes are required'
  );
  assert.ok(vscodeVersion, 'Actual bootstrapping Code version is required');
  const binary = snapshotBootstrapBinary(request.context, before.executable);
  assert.deepEqual(binary, before, 'Native func changed during the actual bootstrap probes');
  const result: MultiRootBootstrapAttestation = {
    schemaVersion: 1,
    suiteId: 'workspaceMultiRoot',
    phaseId: 'runtimeDependencyBootstrap:bootstrap',
    invocation: request.context.invocation,
    identity: request.context.identity,
    runtimeRoot: request.context.runtimeRoot,
    recordedUtc: new Date().toISOString(),
    vscodeVersion,
    probes,
    binary,
  };
  fs.writeFileSync(request.file, JSON.stringify(result), { flag: 'wx' });
}

export function readBootstrapAttestation(
  file: string,
  context: MultiRootBootstrapContext,
  phase: {
    phaseId?: string;
    complete?: boolean;
    exitCode?: number;
    signal?: string | null;
    cleanupVerified?: boolean;
    diagnosticsError?: string;
  }
): MultiRootBootstrapAttestation {
  assert.ok(
    phase?.phaseId === 'runtimeDependencyBootstrap:bootstrap' &&
      phase.complete === true &&
      phase.exitCode === 0 &&
      (phase.signal === null || phase.signal === undefined) &&
      phase.cleanupVerified === true &&
      !phase.diagnosticsError,
    'Only an actual successful finalized official bootstrap can admit Func'
  );
  const result = JSON.parse(fs.readFileSync(file, 'utf8')) as MultiRootBootstrapAttestation;
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.suiteId, 'workspaceMultiRoot');
  assert.equal(result.phaseId, 'runtimeDependencyBootstrap:bootstrap');
  assert.equal(result.invocation, context.invocation, 'Stale/wrong bootstrap invocation');
  assert.deepEqual(result.identity, context.identity, 'Wrong job/source bootstrap attestation');
  assert.equal(result.runtimeRoot, context.runtimeRoot, 'Bootstrap attestation belongs to a different dependency root');
  assert.ok(
    Date.parse(result.recordedUtc) >= Date.parse(context.startedUtc) && Date.parse(result.recordedUtc) <= Date.now(),
    'Stale bootstrap attestation'
  );
  assert.ok(
    result.vscodeVersion &&
      Array.isArray(result.probes) &&
      result.probes.length >= 2 &&
      result.probes.every((probe) => typeof probe === 'string' && /=\d+\.\d+\.\d+/.test(probe)),
    'Native bootstrap probes/version are missing'
  );
  assert.deepEqual(
    snapshotBootstrapBinary(context, result.binary.executable),
    result.binary,
    'Bootstrapped native func changed after admission'
  );
  return result;
}
