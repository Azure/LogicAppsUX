import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createDiagnosticProducer, diagnosticBinding, type DiagnosticProducer } from '../../../scripts/e2e-cli-diagnostics';
import type { MultiRootBootstrapAttestation } from './workspaceMultiRootBootstrap';
import {
  nativePopulationProvider,
  PopulationRace,
  type PopulationCollectionReceipt,
  type PopulationReceiptSink,
} from './workspaceMultiRootCollector';
import { waitForOwnedFuncPopulation } from './workspaceMultiRootOwnership';

const digest = (value: string) => ({ sha256: createHash('sha256').update(value).digest('hex') });

// Separate bounded producer: UI polling may exhaust its 224 routine events
// before this gate starts. This stream has its own reserved terminal capacity.
export function createPopulationDiagnostics(
  trace: DiagnosticProducer,
  context: { executable: string; workspaceFile: string; roots: string[] },
  now = Date.now
) {
  const started = now();
  let samples = 0;
  let races = 0;
  let failures = 0;
  let lastSample = started;
  let lastState: Record<string, unknown> = {};
  const workerPath = path.join(path.dirname(context.executable), 'in-proc8', path.basename(context.executable));
  const binding = {
    workspace: digest(context.workspaceFile),
    roots: context.roots.map(digest),
    expectedCount: context.roots.length,
    admittedExecutable: digest(context.executable),
  };
  const collection: PopulationReceiptSink = (receipt: PopulationCollectionReceipt) => {
    samples++;
    races += receipt.error instanceof PopulationRace ? 1 : 0;
    failures += receipt.error && !(receipt.error instanceof PopulationRace) ? 1 : 0;
    const observed = now();
    lastState = {
      ...binding,
      samples,
      races,
      failures,
      complete: receipt.complete,
      nativePasses: receipt.nativePasses,
      totalRows: receipt.totalRows,
      inspectedRows: receipt.inspectedRows,
      // Last owning IO and most recent IO fault are observations, not proof
      // that a handled fault caused the collection verdict.
      procProbe: receipt.procProbe,
      procFault: receipt.procFault,
      windowsProbe: receipt.windowsProbe,
      windowsFirstProbe: receipt.windowsFirstProbe,
      budgetMs: receipt.budgetMs,
      remainingMs: receipt.remainingMs,
      collectionDurationMs: receipt.durationMs,
      collectionStageCode: receipt.collectionStageCode,
      count: receipt.processes.length,
      launcherPathCount: receipt.processes.filter((record) => record.executable === context.executable).length,
      workerPathCount: receipt.processes.filter((record) => record.executable === workerPath).length,
      unknownPathCount: receipt.processes.filter((record) => record.executable !== context.executable && record.executable !== workerPath)
        .length,
      // Path recognition is observational ONLY, not a worker hash admission or
      // proof of ancestry, command identity, durable workspace binding/ownership.
      ownedCount: 0,
      unknownOwnershipCount: receipt.processes.length,
      ancestryProven: false,
      commandProven: false,
      workspaceProven: false,
      durationMs: observed - started,
      collectionIntervalMs: observed - lastSample,
      processes: receipt.processes.slice(0, 12).map((record) => ({
        pid: record.pid,
        birth: digest(record.birth),
        executable: digest(record.executable),
        sha256: record.sha256,
        parentPid: receipt.parents.find((parent) => parent.pid === record.pid)?.parentPid ?? null,
      })),
      capped: receipt.processes.length > 12,
    };
    lastSample = observed;
    // First samples and periodic receipts bound noisy race loops. Last state is
    // always updated, even when routine emission is capped.
    if (samples <= 4 || samples % 16 === 0 || (receipt.error && !(receipt.error instanceof PopulationRace))) {
      trace.emit('multi-root-population-sample', 'sample', { state: lastState, error: receipt.error });
    }
  };
  return {
    collection,
    async run<T>(body: () => Promise<T>): Promise<T> {
      trace.emit('multi-root-population', 'start', { state: binding });
      let passed = false;
      try {
        const result = await body();
        passed = true;
        try {
          const owned = result as { complete?: boolean; ownership?: unknown[]; processes?: unknown[] };
          if (
            owned?.complete === true &&
            owned.ownership?.length === context.roots.length &&
            owned.processes?.length === context.roots.length * 2
          ) {
            lastState = {
              ...lastState,
              ownedCount: owned.processes.length,
              unknownOwnershipCount: 0,
              ancestryProven: true,
              workspaceProven: true,
            };
          }
        } catch {
          // A diagnostic result inspection must never change the body result.
        }
        return result;
      } catch (error) {
        trace.emit('multi-root-population', 'failure', { error, state: lastState });
        throw error;
      } finally {
        trace.emit('multi-root-population-terminal', 'summary', {
          state: { ...binding, ...lastState, samples, races, failures, ok: passed, durationMs: now() - started },
        });
      }
    },
  };
}

export async function observeFuncPopulation(
  options: Parameters<typeof waitForOwnedFuncPopulation>[1],
  context: { file: string; bootstrap: MultiRootBootstrapAttestation; workspaceFile: string; roots: string[] }
) {
  const trace = createDiagnosticProducer({
    producer: 'multi-root-population',
    maxEvents: 64,
    maxBytes: 131072,
    binding: {
      ...diagnosticBinding(),
      sourceSha: context.bootstrap.identity.source,
      run: context.bootstrap.identity.run,
      suite: 'workspaceMultiRoot',
      phase: 'regular-workbench-population',
      nativeInvocation: context.bootstrap.invocation,
    },
    sink: (line) => fs.appendFileSync(context.file, line),
  });
  const diagnostics = createPopulationDiagnostics(trace, { ...context, executable: options.binary.executable });
  return diagnostics.run(() => waitForOwnedFuncPopulation(nativePopulationProvider(process.platform, diagnostics.collection), options));
}
