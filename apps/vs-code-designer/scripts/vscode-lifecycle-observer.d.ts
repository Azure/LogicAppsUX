import type * as vscode from 'vscode';
import type { NativeProcessIdentity } from './vscode-lifecycle-acceptance';
export interface NativeObservation {
  receipt: string;
  observedAtUtc: string;
  ownershipComplete?: boolean;
  requestedPorts?: number[];
  listeners?: Array<{
    port: number;
    pid: number | null;
    matchedRoot: number | null;
    ancestry: NativeObservation['processes'];
  }>;
  processes: Array<{
    pid: number;
    metadataStatus:
      | 'captured'
      | 'exited-before-inspection'
      | 'exited'
      | 'not-in-containment'
      | 'not-in-job'
      | 'inspection-failed'
      | 'membership-query-failed';
    startTimeTicks?: string;
    identity?: NativeProcessIdentity;
    exitProof?: { source: 'GetProcessTimes'; exitTimeTicks: string };
    parentPid?: number;
    executablePath?: string;
    commandSummary?: {
      sha256: string;
      hashEncoding?: 'linux-proc-cmdline-nul-bytes';
      argumentCount: number;
      safeMarkers: string[];
      scriptOrModuleBasenames: string[];
      payloadPaths: string[];
    };
  }>;
}
export function observeProcesses(directory: string, pids: number[], ports?: number[]): Promise<NativeObservation>;
export function installLifecycleObserver(
  api: typeof vscode,
  env?: NodeJS.ProcessEnv,
  context?: vscode.ExtensionContext
): Promise<{ receipt: string; shutdown(): Promise<void>; dispose(): void } | undefined>;
