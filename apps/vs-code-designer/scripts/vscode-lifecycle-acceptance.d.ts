export interface ProductProof {
  source: 'logicapps-owned-shutdown' | 'logicapps-resource-probe' | 'logicapps-subsequent-startup';
  invocation: string;
  receipt: string;
  observedAt: number;
  verified: boolean;
}

export type NativeProcessIdentity =
  | { platform: 'win32'; kind: 'windows-filetime'; startTimeTicks: string }
  | {
      platform: 'linux';
      kind: 'linux-proc-start';
      startTimeTicks: string;
      bootId: string;
      clockTicksPerSecond: number;
    };

export interface OriginalProcessIdentity {
  pid: number;
  /** Native ticks; interpret only with the platform discriminant. */
  startTimeTicks: string;
  /** Optional only for previously retained Windows FILETIME receipts. */
  identity?: NativeProcessIdentity;
  commandSha256?: string;
}

export interface LifecycleEvidence {
  schemaVersion: 1;
  invocation: string;
  rootPid: number;
  beforeRecoveryAt?: number;
  nextStartupLink?: string;
  requiredStartupDomain?: 'extension-host' | 'design-time';
  shutdown: ProductProof & { ownedProcesses: OriginalProcessIdentity[] };
  resources: ProductProof & { checked: Array<'runtime' | 'design-time' | 'ports' | 'locks'> };
  startup?: ProductProof & {
    launchId: string;
    actualInvocation: string;
    extensionHostPid: number;
    nativeIdentity: { observedAtUtc: string; processes: Array<Record<string, unknown>> };
    domain?: 'extension-host' | 'design-time';
  };
  survivorOwners: Array<{
    pid: number;
    startTimeTicks: string;
    identity?: NativeProcessIdentity;
    commandSha256: string;
    source: 'validated-installed-payload';
    invocation: string;
    receipt: string;
    extensionId: string;
    installationRoot: string;
    executable: string;
    installationSHA256: string;
    payloadSHA256: string;
    processClass: 'csharp-roslyn-language-server';
    productRole: 'independent-dependency' | 'logicapps' | 'shared-runtime' | 'unknown';
  }>;
}

export interface LifecycleAcceptance {
  schemaVersion: 1;
  product: 'passed' | 'failed' | 'blocked' | 'unverified' | 'pending-startup';
  infrastructure: 'clean' | 'recovered' | 'failed';
  recovered: boolean;
  accepted: boolean;
  reason: string;
}

export function evaluateLifecycleAcceptance(closure: Record<string, unknown>, evidence?: LifecycleEvidence): LifecycleAcceptance;
export function isProcessCleanupAccepted(closure?: Record<string, unknown>): boolean;
export function canContinueAfterProcessCleanup(closure?: Record<string, unknown>): boolean;
export function isTerminalProcessClosureAccepted(terminal?: Record<string, unknown>): boolean;
