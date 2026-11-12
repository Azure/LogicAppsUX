/**
 * Optional, non-authoritative diagnostics for the native regeneration hosts.
 * None of these observations can approve a prompt or change the phase deadline.
 */
import { createHash, createHmac, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { regenerationPhaseIds } from './workspaceArtifactRegeneration';

export const regenerationProbeVariables = [
  'LA_E2E_CLI_REGENERATION_PROBE',
  'LA_E2E_CLI_REGENERATION_TRACE_FILE',
  'LA_E2E_CLI_REGENERATION_TRACE_PHASE',
  'LA_E2E_CLI_REGENERATION_TRACE_INVOCATION',
] as const;

const registeredHosts = new Set(
  regenerationPhaseIds.filter((phase) => phase !== 'workspaceArtifactRegeneration:create').map((phase) => phase.split(':')[1])
);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxTraceBytes = 512 * 1024;
const maxTraceRecords = 4096;
const maxCoverageGapMs = 5000;
const emptyProductEvents = new Set([
  'recorder-armed',
  'heartbeat',
  'activation-start',
  'activation-returned',
  'activation-workspace-setup-start',
  'activation-workspace-setup-returned',
  'activation-project-discovery-start',
  'activation-project-files-start',
  'activation-project-files-returned',
  'activation-vscode-check-scheduled',
  'activation-vscode-check-entered',
  'workspace-listener-registered',
  'workspace-change-entered',
  'workspace-change-returned',
  'workspace-catchup-start',
  'workspace-catchup-returned',
  'consistency-check-entered',
  'consistency-check-returned',
]);
const warningResults = new Set(['yes', 'dont-warn-again', 'undefined', 'other']);

/** Match the producer's fixed event union; never accept arbitrary strings. */
export function validRegenerationProductPayload(event: string, value: unknown): boolean {
  if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) {
    return false;
  }
  const payload = (value ?? {}) as Record<string, unknown>;
  const keys = (expected: string[]) =>
    Object.keys(payload).length === expected.length && expected.every((key) => Object.hasOwn(payload, key));
  const count = (item: unknown) => typeof item === 'number' && Number.isSafeInteger(item) && item >= 0 && item <= 1_000_000;
  if (emptyProductEvents.has(event)) {
    return keys([]);
  }
  switch (event) {
    case 'recorder-overflow':
      return keys(['reason']) && (payload.reason === 'event-limit' || payload.reason === 'queue-limit');
    case 'activation-workspace':
      return keys(['folderCount']) && count(payload.folderCount);
    case 'activation-project-discovery-returned':
    case 'consistency-project-discovery-returned':
      return keys(['projectCount']) && count(payload.projectCount);
    case 'workspace-catchup-decision':
      return keys(['needed']) && typeof payload.needed === 'boolean';
    case 'consistency-check-skipped':
      return keys(['reason']) && typeof payload.reason === 'string' && ['no-workspace', 'no-projects', 'disabled'].includes(payload.reason);
    case 'consistency-setting':
      return keys(['enabled']) && typeof payload.enabled === 'boolean';
    case 'initialization-check':
      return (
        keys(['firstMissing', 'hasLanguage', 'hasFuncVersion']) &&
        typeof payload.firstMissing === 'string' &&
        ['none', 'tasks', 'launch', 'settings', 'extensions'].includes(payload.firstMissing) &&
        typeof payload.hasLanguage === 'boolean' &&
        typeof payload.hasFuncVersion === 'boolean'
      );
    case 'warning-call-entered':
    case 'warning-call-returned':
    case 'warning-result':
    case 'warning-error': {
      const expected = ['kind', 'warningId'];
      if (event === 'warning-result') {
        expected.push('result');
      }
      if (event === 'warning-error') {
        expected.push('errorKind');
      }
      return (
        keys(expected) &&
        typeof payload.kind === 'string' &&
        ['initialization', 'outdated', 'overwrite'].includes(payload.kind) &&
        count(payload.warningId) &&
        Number(payload.warningId) > 0 &&
        (event !== 'warning-result' || (typeof payload.result === 'string' && warningResults.has(payload.result))) &&
        (event !== 'warning-error' || payload.errorKind === 'error' || payload.errorKind === 'non-error')
      );
    }
    default:
      return false;
  }
}

export interface RegenerationProbeReceipt {
  schemaVersion: 1;
  status: 'armed';
  suiteId: 'workspaceArtifactRegeneration';
  invocation: string;
  phase: string;
  armId: string;
  traceFile: string;
  identityBinding: string;
  armedAtUtc: string;
}

export interface RegenerationProbe {
  requested: boolean;
  childEnv: NodeJS.ProcessEnv;
  phase: string;
  invocation: string;
  root: string;
  reason?: string;
  receipt?: RegenerationProbeReceipt;
  tracePath?: string;
  receiptPath?: string;
  receiptHash?: string;
  receiptIdentity?: { dev: number; ino: number };
  traceIdentity?: { dev: number; ino: number };
  spawnRequestedAt?: number;
  spawnObservedAt?: number;
}

export interface RegenerationProductCoverage {
  schemaVersion: 1;
  suiteId: 'workspaceArtifactRegeneration';
  invocation: string;
  phase: string;
  armId: string | null;
  availability: 'available' | 'partial' | 'unavailable';
  coverageThroughDecision: boolean;
  reason: string;
  reasonCodes: string[];
  partial: boolean;
  recordCount: number;
  lastSequence: number;
  heartbeatCount: number;
  armedAtUtc: string | null;
  spawnRequestedAtUtc: string | null;
  spawnObservedAtUtc: string | null;
  decisionAtUtc: string;
  lastEventAtUtc: string | null;
  lastHeartbeatAtUtc: string | null;
  traceByteLength: number | null;
  traceSha256: string | null;
}

function iso(value: number | undefined): string | null {
  return value === undefined || !Number.isFinite(value) ? null : new Date(value).toISOString();
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => (process.platform === 'win32' ? path.normalize(value).toLowerCase() : path.normalize(value));
  return normalize(left) === normalize(right);
}

/** Always scrub inherited probe variables, even when diagnostics are disabled. */
export function armRegenerationProbe(options: {
  root: string;
  phase: string;
  invocation: string;
  identity: Record<string, string>;
  env: NodeJS.ProcessEnv;
}): RegenerationProbe {
  const probeVariables = new Set<string>(regenerationProbeVariables);
  const childEnv = Object.fromEntries(
    Object.entries(options.env).filter(
      ([key]) => !probeVariables.has(key.toUpperCase()) && key.toUpperCase() !== 'LA_E2E_CLI_DIAGNOSTIC_ONLY'
    )
  );
  const probe: RegenerationProbe = {
    requested: options.env.LA_E2E_CLI_DIAGNOSTIC_ONLY === 'true',
    childEnv,
    phase: options.phase,
    invocation: options.invocation,
    root: options.root,
  };
  if (!probe.requested) {
    return probe;
  }
  if (!registeredHosts.has(options.phase) || !uuid.test(options.invocation)) {
    probe.reason = 'invalid-host-binding';
    return probe;
  }
  try {
    const root = path.resolve(options.root);
    const rootStat = fs.lstatSync(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || !samePath(root, fs.realpathSync(root))) {
      probe.reason = 'unsafe-owned-root';
      return probe;
    }
    const traceFile = `${options.phase}-product-events.jsonl`;
    const tracePath = path.join(root, traceFile);
    const receiptPath = path.join(root, `${options.phase}-product-arming.json`);
    const armId = randomUUID();
    const canonicalIdentity = JSON.stringify(Object.entries(options.identity).sort(([a], [b]) => a.localeCompare(b)));
    const receipt: RegenerationProbeReceipt = {
      schemaVersion: 1,
      status: 'armed',
      suiteId: 'workspaceArtifactRegeneration',
      invocation: options.invocation,
      phase: options.phase,
      armId,
      traceFile,
      identityBinding: createHmac('sha256', armId).update(canonicalIdentity).digest('hex'),
      armedAtUtc: new Date().toISOString(),
    };
    // Both files are exclusive. A stale trace or receipt is never overwritten.
    const traceFd = fs.openSync(tracePath, 'wx', 0o600);
    let traceStat: fs.Stats;
    try {
      traceStat = fs.fstatSync(traceFd);
      if (!traceStat.isFile() || traceStat.nlink !== 1) {
        throw new Error('unsafe trace');
      }
      fs.fsyncSync(traceFd);
    } finally {
      fs.closeSync(traceFd);
    }
    const receiptBytes = `${JSON.stringify(receipt)}\n`;
    const receiptFd = fs.openSync(receiptPath, 'wx', 0o600);
    let receiptStat: fs.Stats;
    try {
      receiptStat = fs.fstatSync(receiptFd);
      if (!receiptStat.isFile() || receiptStat.nlink !== 1) {
        throw new Error('unsafe receipt');
      }
      fs.writeFileSync(receiptFd, receiptBytes);
      fs.fsyncSync(receiptFd);
    } finally {
      fs.closeSync(receiptFd);
    }
    Object.assign(probe, {
      root,
      receipt,
      tracePath,
      receiptPath,
      receiptHash: createHash('sha256').update(receiptBytes).digest('hex'),
      receiptIdentity: { dev: receiptStat.dev, ino: receiptStat.ino },
      traceIdentity: { dev: traceStat.dev, ino: traceStat.ino },
    });
    Object.assign(childEnv, {
      LA_E2E_CLI_REGENERATION_PROBE: '1',
      LA_E2E_CLI_REGENERATION_TRACE_FILE: tracePath,
      LA_E2E_CLI_REGENERATION_TRACE_PHASE: options.phase,
      LA_E2E_CLI_REGENERATION_TRACE_INVOCATION: options.invocation,
    });
  } catch {
    // Never launch the producer with an unproved or partially written receipt.
    probe.reason = 'arming-failed';
  }
  return probe;
}

function readOwnedTrace(probe: RegenerationProbe): Buffer {
  if (!probe.tracePath || !probe.receiptPath || !probe.traceIdentity || !probe.receiptIdentity || !probe.receiptHash) {
    throw new Error('unarmed');
  }
  const rootStat = fs.lstatSync(probe.root);
  const receiptStat = fs.lstatSync(probe.receiptPath);
  const traceStat = fs.lstatSync(probe.tracePath);
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    !samePath(probe.root, fs.realpathSync(probe.root)) ||
    !receiptStat.isFile() ||
    receiptStat.isSymbolicLink() ||
    receiptStat.nlink !== 1 ||
    receiptStat.dev !== probe.receiptIdentity.dev ||
    receiptStat.ino !== probe.receiptIdentity.ino ||
    !samePath(probe.receiptPath, fs.realpathSync(probe.receiptPath)) ||
    !traceStat.isFile() ||
    traceStat.isSymbolicLink() ||
    traceStat.nlink !== 1 ||
    !samePath(probe.tracePath, fs.realpathSync(probe.tracePath)) ||
    traceStat.dev !== probe.traceIdentity.dev ||
    traceStat.ino !== probe.traceIdentity.ino
  ) {
    throw new Error('ownership');
  }
  const receiptFd = fs.openSync(probe.receiptPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const opened = fs.fstatSync(receiptFd);
    if (opened.dev !== probe.receiptIdentity.dev || opened.ino !== probe.receiptIdentity.ino || opened.size > 4096) {
      throw new Error('ownership');
    }
    if (createHash('sha256').update(fs.readFileSync(receiptFd)).digest('hex') !== probe.receiptHash) {
      throw new Error('receipt');
    }
  } finally {
    fs.closeSync(receiptFd);
  }
  const fd = fs.openSync(probe.tracePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const actual = fs.fstatSync(fd);
    if (actual.dev !== probe.traceIdentity.dev || actual.ino !== probe.traceIdentity.ino) {
      throw new Error('ownership');
    }
    if (actual.size > maxTraceBytes) {
      throw new Error('overflow');
    }
    const buffer = Buffer.alloc(actual.size);
    let length = 0;
    while (length < buffer.length) {
      const read = fs.readSync(fd, buffer, length, buffer.length - length, length);
      if (read === 0) {
        throw new Error('changing');
      }
      length += read;
    }
    if (fs.fstatSync(fd).size !== actual.size) {
      throw new Error('changing');
    }
    return buffer;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * The trace is an observation, not an assertion about whether a notification was
 * displayed. In particular a missing writer/heartbeat is never an absence proof.
 */
export function assessRegenerationProductCoverage(probe: RegenerationProbe, decisionAt: number): RegenerationProductCoverage {
  const result: RegenerationProductCoverage = {
    schemaVersion: 1,
    suiteId: 'workspaceArtifactRegeneration',
    invocation: probe.invocation,
    phase: probe.phase,
    armId: probe.receipt?.armId ?? null,
    availability: 'unavailable',
    coverageThroughDecision: false,
    reason: 'collection-unavailable',
    reasonCodes: [],
    partial: false,
    recordCount: 0,
    lastSequence: 0,
    heartbeatCount: 0,
    armedAtUtc: probe.receipt?.armedAtUtc ?? null,
    spawnRequestedAtUtc: iso(probe.spawnRequestedAt),
    spawnObservedAtUtc: iso(probe.spawnObservedAt),
    decisionAtUtc: iso(decisionAt)!,
    lastEventAtUtc: null,
    lastHeartbeatAtUtc: null,
    traceByteLength: null,
    traceSha256: null,
  };
  const reject = (reason: string) => {
    if (!result.reasonCodes.includes(reason)) {
      result.reasonCodes.push(reason);
    }
    result.reason = result.reasonCodes[0];
  };
  if (probe.reason || !probe.receipt) {
    reject(probe.reason ?? 'arming-unavailable');
    return result;
  }
  const armedAt = Date.parse(probe.receipt.armedAtUtc);
  if (
    probe.spawnRequestedAt === undefined ||
    probe.spawnObservedAt === undefined ||
    armedAt > probe.spawnRequestedAt ||
    probe.spawnRequestedAt > probe.spawnObservedAt ||
    probe.spawnObservedAt > decisionAt
  ) {
    reject('pre-spawn-arming-unproved');
  }
  let contents: string;
  try {
    const bytes = readOwnedTrace(probe);
    result.traceByteLength = bytes.length;
    result.traceSha256 = createHash('sha256').update(bytes).digest('hex');
    contents = bytes.toString('utf8');
  } catch (error) {
    const kind = error instanceof Error ? error.message : '';
    reject(
      kind === 'overflow'
        ? 'trace-overflow'
        : kind === 'receipt'
          ? 'arming-receipt-changed'
          : kind === 'changing'
            ? 'trace-changing'
            : 'trace-ownership-or-read-failed'
    );
    return result;
  }
  if (!contents) {
    reject('recorder-arming-missing');
    return result;
  }
  result.partial = true;
  if (!contents.endsWith('\n')) {
    reject('incomplete-jsonl');
  }
  const lines = contents.split('\n');
  // An incomplete trailing write is partial, not a malformed complete record.
  lines.pop();
  if (lines.some((line) => !line)) {
    reject('invalid-jsonl');
  }
  if (lines.length > maxTraceRecords) {
    reject('trace-overflow');
    return result;
  }
  let lastTime = -1;
  let decisionCoveredByEvent = false;
  let activationSeen = false;
  for (let index = 0; index < lines.length; index++) {
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(lines[index]);
    } catch {
      reject('invalid-jsonl');
      break;
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      reject('invalid-record');
      break;
    }
    result.recordCount++;
    if (
      record.schemaVersion !== 1 ||
      record.invocation !== probe.invocation ||
      record.phase !== probe.phase ||
      record.armId !== probe.receipt.armId
    ) {
      reject('binding-mismatch');
    }
    if (record.sequence !== index + 1) {
      reject('sequence-gap');
    } else {
      result.lastSequence = index + 1;
    }
    const stamp =
      typeof record.timestampUtc === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(record.timestampUtc)
        ? Date.parse(record.timestampUtc)
        : Number.NaN;
    if (!Number.isFinite(stamp) || stamp < lastTime || stamp > Date.now() + 1000) {
      reject('invalid-event-time');
    }
    if (lastTime >= 0 && lastTime < decisionAt && stamp - lastTime > maxCoverageGapMs) {
      reject('coverage-gap');
    }
    if (index > 0 && stamp >= decisionAt && lastTime <= decisionAt) {
      decisionCoveredByEvent = true;
    }
    lastTime = stamp;
    result.lastEventAtUtc = Number.isFinite(stamp) ? iso(stamp) : null;
    if (typeof record.event !== 'string') {
      reject('invalid-event-code');
    }
    const keys = Object.keys(record);
    if (
      keys.some((key) => !['schemaVersion', 'invocation', 'phase', 'armId', 'sequence', 'timestampUtc', 'event', 'payload'].includes(key))
    ) {
      reject('invalid-record-schema');
    }
    if (typeof record.event === 'string' && !validRegenerationProductPayload(record.event, record.payload)) {
      reject('invalid-event-or-payload');
    }
    if (index === 0) {
      if (
        record.event !== 'recorder-armed' ||
        stamp < armedAt ||
        (probe.spawnRequestedAt !== undefined && stamp < probe.spawnRequestedAt)
      ) {
        reject('recorder-arming-late-or-invalid');
      }
    }
    if (record.event === 'activation-start') {
      if (activationSeen || index === 0 || stamp > decisionAt) {
        reject('activation-start-unproved');
      } else {
        activationSeen = true;
      }
    }
    if (record.event === 'heartbeat') {
      result.heartbeatCount++;
      result.lastHeartbeatAtUtc = Number.isFinite(stamp) ? iso(stamp) : null;
    }
    if (record.event === 'recorder-overflow') {
      reject('producer-write-or-overflow');
    }
  }
  if (!activationSeen) {
    reject('activation-start-unproved');
  }
  if (!decisionCoveredByEvent) {
    reject('coverage-through-decision-unproved');
  }
  if (result.reasonCodes.length === 0) {
    result.availability = 'available';
    result.coverageThroughDecision = true;
    result.reason = 'complete';
    result.partial = false;
  }
  return result;
}

/** Wait only for actual post-decision producer progress; never extend acceptance. */
export async function finishRegenerationProductCoverage(
  probe: RegenerationProbe,
  decisionAt: number
): Promise<RegenerationProductCoverage> {
  let coverage = assessRegenerationProductCoverage(probe, decisionAt);
  const deadline = Date.now() + 3000;
  while (
    probe.receipt &&
    coverage.reasonCodes.length > 0 &&
    coverage.reasonCodes.every((reason) =>
      [
        'recorder-arming-missing',
        'coverage-through-decision-unproved',
        'incomplete-jsonl',
        'activation-start-unproved',
        'trace-changing',
      ].includes(reason)
    ) &&
    coverage.availability !== 'available' &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, deadline - Date.now())));
    coverage = assessRegenerationProductCoverage(probe, decisionAt);
  }
  try {
    const rootStat = fs.lstatSync(probe.root);
    if (
      !registeredHosts.has(probe.phase) ||
      !uuid.test(probe.invocation) ||
      !rootStat.isDirectory() ||
      rootStat.isSymbolicLink() ||
      !samePath(path.resolve(probe.root), fs.realpathSync(probe.root))
    ) {
      throw new Error('invalid binding');
    }
    fs.writeFileSync(path.join(probe.root, `${probe.phase}-product-collection.json`), `${JSON.stringify(coverage, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o600,
    });
  } catch {
    // Missing status is itself unavailable; never replace the original result.
    console.warn('[workspace-regeneration-diagnostics] product-collection-write-failed');
  }
  return coverage;
}
