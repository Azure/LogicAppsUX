export interface OwnedProcessIdentity {
  pid: number;
  parentPid: number;
  creationIdentity: string;
  executable: string;
}

export interface OwnedProcessEvidence {
  schemaVersion: number;
  recordDomain: string;
  invocationId: string;
  platform: string;
  owner: OwnedProcessIdentity;
  observedProcesses: Array<OwnedProcessIdentity & { ancestry: OwnedProcessIdentity[] }>;
  actions: Array<{ pid: number; creationIdentity: string; requested: boolean }>;
  observations: number;
  processExitVerified: boolean;
  filesystemCleanupVerified: boolean;
}

export interface OwnedProcessCleanup {
  capture(): Promise<OwnedProcessEvidence>;
  finalize(): Promise<OwnedProcessEvidence>;
  evidence(): OwnedProcessEvidence;
}

export interface OwnedProcessProvider {
  snapshot(budget: number): Promise<OwnedProcessIdentity[]>;
  terminateExact?(record: OwnedProcessIdentity, budget: number): Promise<void>;
}

export function createOwnedProcessCleanup(contract: {
  invocationId: string;
  platform: string;
  owner: OwnedProcessIdentity;
  roots: Array<{ kind: string; directory: string }>;
  snapshot: OwnedProcessProvider['snapshot'];
  terminateExact?: OwnedProcessProvider['terminateExact'];
  now(): number;
  deadline: number;
  maxObservations?: number;
}): OwnedProcessCleanup;

export class OwnedProcessEvidenceError extends Error {
  constructor(reason: string);
  reason: string;
}
