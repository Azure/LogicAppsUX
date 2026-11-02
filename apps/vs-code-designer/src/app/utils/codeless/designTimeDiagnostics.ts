import {
  getDesignTimeDiagnosticProducer,
  observeDesignTimeSpawnIdentity,
  bindDesignTimeSpawnIdentity,
  type DiagnosticSpan,
} from '../../../../scripts/e2e-cli-diagnostics';
import type { ChildProcess } from 'node:child_process';

// Bounded test-only original birth capture plus a supplemental asynchronous
// observer; neither capture may change the owning product verdict.
export function observeSpawnIdentity(child: ChildProcess, project: string, workingDirectory: string): void {
  try {
    bindDesignTimeSpawnIdentity(child, project, workingDirectory);
    observeDesignTimeSpawnIdentity(child, project).catch(() => undefined);
  } catch {
    // Supplemental capture must never mask spawn or prevent group ownership.
  }
}

// Evaluate snapshots only after admission. Neither state nor diagnostic IO
// failures may affect the owner's result, thrown value or lifecycle.
export function emitDesignTimeDiagnostic(operation: string, state: () => unknown): void {
  try {
    getDesignTimeDiagnosticProducer()?.emit(operation, 'sample', { state: { ...(state() as object), hostPid: process.pid } });
  } catch {
    // Supplemental test telemetry only.
  }
}

export function startDesignTimeDiagnostic(operation: string, state: () => unknown): DiagnosticSpan | undefined {
  try {
    return getDesignTimeDiagnosticProducer()?.start(operation, { ...(state() as object), hostPid: process.pid });
  } catch {
    return undefined;
  }
}

export function finishDesignTimeDiagnostic(span: DiagnosticSpan | undefined, state: () => unknown, failure?: { error: unknown }): void {
  try {
    if (span) {
      const snapshot = { ...(state() as object), hostPid: process.pid };
      if (failure) {
        span.fail(failure.error, snapshot);
      } else {
        span.end(snapshot);
      }
    }
  } catch {
    // Preserve even non-Error thrown values from the actual owning operation.
  }
}
