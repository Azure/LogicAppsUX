/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { constants, promises as fs } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import * as path from 'node:path';

type WarningKind = 'initialization' | 'outdated' | 'overwrite';
type WarningResult = 'yes' | 'dont-warn-again' | 'undefined' | 'other';
type EmptyEvent =
  | 'recorder-armed'
  | 'heartbeat'
  | 'activation-start'
  | 'activation-returned'
  | 'activation-workspace-setup-start'
  | 'activation-workspace-setup-returned'
  | 'activation-project-discovery-start'
  | 'activation-project-files-start'
  | 'activation-project-files-returned'
  | 'activation-vscode-check-scheduled'
  | 'activation-vscode-check-entered'
  | 'workspace-listener-registered'
  | 'workspace-change-entered'
  | 'workspace-change-returned'
  | 'workspace-catchup-start'
  | 'workspace-catchup-returned'
  | 'consistency-check-entered'
  | 'consistency-check-returned';

export type RegenerationProbeEvent =
  | { event: EmptyEvent }
  | { event: 'recorder-overflow'; reason: 'event-limit' | 'queue-limit' }
  | { event: 'activation-workspace'; folderCount: number }
  | { event: 'activation-project-discovery-returned' | 'consistency-project-discovery-returned'; projectCount: number }
  | { event: 'workspace-catchup-decision'; needed: boolean }
  | { event: 'consistency-check-skipped'; reason: 'no-workspace' | 'no-projects' | 'disabled' }
  | { event: 'consistency-setting'; enabled: boolean }
  | {
      event: 'initialization-check';
      firstMissing: 'none' | 'tasks' | 'launch' | 'settings' | 'extensions';
      hasLanguage: boolean;
      hasFuncVersion: boolean;
    }
  | { event: 'warning-call-entered' | 'warning-call-returned'; kind: WarningKind; warningId: number }
  | { event: 'warning-result'; kind: WarningKind; warningId: number; result: WarningResult }
  | { event: 'warning-error'; kind: WarningKind; warningId: number; errorKind: 'error' | 'non-error' };

interface QueuedEvent {
  sequence: number;
  timestampUtc: string;
  value: RegenerationProbeEvent;
}

interface ProbeConfiguration {
  traceFile: string;
  phase: string;
  invocation: string;
}

type ProbeFailure = 'invalid-configuration' | 'initialization-failed' | 'write-failed' | 'close-failed';

export interface RegenerationProbe {
  record(event: RegenerationProbeEvent): void;
  flush(): Promise<void>;
  dispose(): Promise<void>;
}

const phaseNames = new Set([
  'baseline',
  'vscode-single',
  'vscode-single-reopen',
  'vscode-multiple',
  'vscode-multiple-reopen',
  'vscode-repeat',
  'vscode-repeat-reopen',
  'root-single',
  'root-single-reopen',
  'root-multiple',
  'root-multiple-reopen',
  'root-repeat',
  'root-repeat-reopen',
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxEvents = 512;
const maxQueuedEvents = 128;
const maxReceiptBytes = 4096;

const disabledProbe: RegenerationProbe = {
  record: () => undefined,
  flush: async () => undefined,
  dispose: async () => undefined,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function openOriginalFile(file: string, flags: number): Promise<FileHandle> {
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
    throw new Error('Probe input is not an original regular file');
  }
  const handle = await fs.open(file, flags | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error('Probe input changed during open');
    }
    return handle;
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function readArmingReceipt(config: ProbeConfiguration): Promise<{ armId: string; armedAtUtc: string }> {
  const receiptPath = path.join(path.dirname(config.traceFile), `${config.phase}-product-arming.json`);
  const receiptFile = await openOriginalFile(receiptPath, constants.O_RDONLY);
  try {
    const stat = await receiptFile.stat();
    if (stat.size > maxReceiptBytes) {
      throw new Error('Probe receipt exceeds its size limit');
    }
    const receipt: unknown = JSON.parse(await receiptFile.readFile('utf8'));
    if (
      !isRecord(receipt) ||
      receipt.schemaVersion !== 1 ||
      receipt.status !== 'armed' ||
      receipt.suiteId !== 'workspaceArtifactRegeneration' ||
      receipt.invocation !== config.invocation ||
      receipt.phase !== config.phase ||
      receipt.traceFile !== path.basename(config.traceFile) ||
      typeof receipt.armId !== 'string' ||
      !uuidPattern.test(receipt.armId) ||
      typeof receipt.armedAtUtc !== 'string' ||
      !Number.isFinite(Date.parse(receipt.armedAtUtc))
    ) {
      throw new Error('Probe receipt is not bound to this host');
    }
    return { armId: receipt.armId, armedAtUtc: receipt.armedAtUtc };
  } finally {
    await receiptFile.close();
  }
}

function projectPayload(value: RegenerationProbeEvent): Record<string, string | number | boolean> {
  switch (value.event) {
    case 'recorder-overflow':
    case 'consistency-check-skipped':
      return { reason: value.reason };
    case 'activation-workspace':
      return { folderCount: value.folderCount };
    case 'activation-project-discovery-returned':
    case 'consistency-project-discovery-returned':
      return { projectCount: value.projectCount };
    case 'workspace-catchup-decision':
      return { needed: value.needed };
    case 'consistency-setting':
      return { enabled: value.enabled };
    case 'initialization-check':
      return { firstMissing: value.firstMissing, hasLanguage: value.hasLanguage, hasFuncVersion: value.hasFuncVersion };
    case 'warning-call-entered':
    case 'warning-call-returned':
      return { kind: value.kind, warningId: value.warningId };
    case 'warning-result':
      return { kind: value.kind, warningId: value.warningId, result: value.result };
    case 'warning-error':
      return { kind: value.kind, warningId: value.warningId, errorKind: value.errorKind };
    default:
      return {};
  }
}

class FileRegenerationProbe implements RegenerationProbe {
  private readonly queue: QueuedEvent[] = [];
  private readonly ready: Promise<void>;
  private readonly timer: NodeJS.Timeout;
  private handle: FileHandle | undefined;
  private armId = '';
  private sequence = 0;
  private exhausted = false;
  private failed = false;
  private disposed = false;
  private draining = false;
  private drainPromise: Promise<void> = Promise.resolve();

  constructor(
    private readonly config: ProbeConfiguration,
    private readonly reportFailure: (reason: ProbeFailure) => void
  ) {
    this.enqueue({ event: 'recorder-armed' });
    this.ready = this.initialize();
    this.timer = setInterval(() => this.record({ event: 'heartbeat' }), 2000);
    this.timer.unref();
  }

  public record(event: RegenerationProbeEvent): void {
    if (this.failed || this.exhausted || this.disposed) {
      return;
    }
    if (this.sequence >= maxEvents - 1 || this.queue.length >= maxQueuedEvents - 1) {
      this.enqueue({
        event: 'recorder-overflow',
        reason: this.sequence >= maxEvents - 1 ? 'event-limit' : 'queue-limit',
      });
      this.exhausted = true;
      clearInterval(this.timer);
    } else {
      this.enqueue(event);
    }
    this.scheduleDrain();
  }

  public async flush(): Promise<void> {
    await this.ready;
    while (this.draining) {
      await this.drainPromise;
    }
  }

  public async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    clearInterval(this.timer);
    await this.flush();
    try {
      await this.handle?.close();
    } catch {
      this.reportFailure('close-failed');
    }
  }

  private enqueue(value: RegenerationProbeEvent): void {
    this.queue.push({ sequence: ++this.sequence, timestampUtc: new Date().toISOString(), value });
  }

  private async initialize(): Promise<void> {
    try {
      const receipt = await readArmingReceipt(this.config);
      if (Date.parse(receipt.armedAtUtc) > Date.parse(this.queue[0].timestampUtc)) {
        throw new Error('Probe was armed after the recorder started');
      }
      this.armId = receipt.armId;
      this.handle = await openOriginalFile(this.config.traceFile, constants.O_WRONLY | constants.O_APPEND);
      this.scheduleDrain();
    } catch {
      this.failed = true;
      this.queue.length = 0;
      clearInterval(this.timer);
      this.reportFailure('initialization-failed');
    }
  }

  private scheduleDrain(): void {
    if (!this.handle || this.draining || this.failed) {
      return;
    }
    this.draining = true;
    this.drainPromise = this.drain();
  }

  private async drain(): Promise<void> {
    try {
      while (this.queue.length > 0) {
        const entry = this.queue.shift();
        if (!entry || !this.handle) {
          break;
        }
        const event = entry.value.event;
        const payload = projectPayload(entry.value);
        const record = {
          schemaVersion: 1,
          invocation: this.config.invocation,
          phase: this.config.phase,
          armId: this.armId,
          sequence: entry.sequence,
          timestampUtc: entry.timestampUtc,
          event,
          ...(Object.keys(payload).length ? { payload } : {}),
        };
        await this.handle.writeFile(`${JSON.stringify(record)}\n`, 'utf8');
      }
    } catch {
      this.failed = true;
      this.queue.length = 0;
      clearInterval(this.timer);
      this.reportFailure('write-failed');
      try {
        await this.handle?.close();
        this.handle = undefined;
      } catch {
        this.reportFailure('close-failed');
      }
    } finally {
      this.draining = false;
    }
  }
}

export function createRegenerationProbe(
  env: NodeJS.ProcessEnv,
  reportFailure: (reason: ProbeFailure) => void = (reason) => console.error(`[regeneration-probe] ${reason}`)
): RegenerationProbe {
  if (env.LA_E2E_CLI_REGENERATION_PROBE !== '1') {
    return disabledProbe;
  }
  const traceFile = env.LA_E2E_CLI_REGENERATION_TRACE_FILE;
  const phase = env.LA_E2E_CLI_REGENERATION_TRACE_PHASE;
  const invocation = env.LA_E2E_CLI_REGENERATION_TRACE_INVOCATION;
  if (
    !traceFile ||
    !path.isAbsolute(traceFile) ||
    !phase ||
    !phaseNames.has(phase) ||
    path.basename(traceFile) !== `${phase}-product-events.jsonl` ||
    !invocation ||
    !uuidPattern.test(invocation)
  ) {
    reportFailure('invalid-configuration');
    return disabledProbe;
  }
  return new FileRegenerationProbe({ traceFile, phase, invocation }, reportFailure);
}

const probe = createRegenerationProbe(process.env);
let warningSequence = 0;

export function recordRegenerationEvent(event: RegenerationProbeEvent): void {
  try {
    probe.record(event);
  } catch {
    console.error('[regeneration-probe] recording-failed');
  }
}

export function beginRegenerationWarning(kind: WarningKind): number {
  const warningId = ++warningSequence;
  recordRegenerationEvent({ event: 'warning-call-entered', kind, warningId });
  return warningId;
}
