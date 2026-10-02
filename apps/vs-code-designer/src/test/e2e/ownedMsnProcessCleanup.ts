import * as fs from 'fs';
import * as path from 'path';
import {
  createOwnedProcessCleanup,
  OwnedProcessEvidenceError,
  type OwnedProcessEvidence,
  type OwnedProcessIdentity,
  type OwnedProcessProvider,
} from '../../../scripts/e2e-cli-owned-processes';
import { createProcessObservationProvider } from '../../../scripts/e2e-cli-process-observation';
import type { OwnedMsnProcessCleanup } from './ownedMsnShutdown';

function parseOwner(text: string | undefined): OwnedProcessIdentity {
  let value: unknown;
  try {
    value = JSON.parse(text ?? '');
  } catch {
    throw new OwnedProcessEvidenceError('missing-or-malformed-owner-input');
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    !('pid' in value) ||
    typeof value.pid !== 'number' ||
    !('parentPid' in value) ||
    typeof value.parentPid !== 'number' ||
    !('creationIdentity' in value) ||
    typeof value.creationIdentity !== 'string' ||
    !('executable' in value) ||
    typeof value.executable !== 'string'
  ) {
    throw new OwnedProcessEvidenceError('invalid-owner-input');
  }
  return {
    pid: value.pid,
    parentPid: value.parentPid,
    creationIdentity: value.creationIdentity,
    executable: value.executable,
  };
}

interface ProcessCleanupDependencies {
  provider(): OwnedProcessProvider;
  now(): number;
}

function initializeMsnProcessCleanup(env: NodeJS.ProcessEnv, dependenciesInput: ProcessCleanupDependencies): OwnedMsnProcessCleanup {
  const invocationId = env.LA_E2E_CLI_MSN_PROCESS_INVOCATION ?? '';
  const workspace = env.LA_E2E_CLI_WORKSPACE_PARENT;
  const dependencies = env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT;
  const evidenceBase = env.LA_E2E_CLI_MSN_PROCESS_EVIDENCE_BASE;
  if (!workspace || !dependencies || !evidenceBase || !path.isAbsolute(evidenceBase)) {
    throw new OwnedProcessEvidenceError('missing-owned-process-environment');
  }

  const parent = path.dirname(evidenceBase);
  const parentStat = fs.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || path.basename(evidenceBase) !== `owned-processes-${invocationId}`) {
    throw new OwnedProcessEvidenceError('unsafe-process-evidence-location');
  }
  const canonicalParent = fs.realpathSync(parent);
  const provider = dependenciesInput.provider();
  const guard = createOwnedProcessCleanup({
    invocationId,
    platform: process.platform,
    owner: parseOwner(env.LA_E2E_CLI_MSN_PROCESS_OWNER_JSON),
    roots: [
      { kind: 'workspace', directory: workspace },
      { kind: 'dependencies', directory: dependencies },
    ],
    ...provider,
    now: dependenciesInput.now,
    deadline: dependenciesInput.now() + 10_000,
  });

  function persist(stage: string, evidence: OwnedProcessEvidence, reason?: string): void {
    const currentStat = fs.lstatSync(parent);
    if (
      fs.realpathSync(parent) !== canonicalParent ||
      currentStat.isSymbolicLink() ||
      !currentStat.isDirectory() ||
      currentStat.dev !== parentStat.dev ||
      currentStat.ino !== parentStat.ino
    ) {
      throw new OwnedProcessEvidenceError('process-evidence-location-changed');
    }
    fs.writeFileSync(
      `${evidenceBase}.${stage}.json`,
      `${JSON.stringify({ ...evidence, ...(reason ? { failureReason: reason } : {}) }, null, 2)}\n`,
      {
        flag: 'wx',
      }
    );
  }

  async function observe(stage: string, operation: () => Promise<OwnedProcessEvidence>): Promise<void> {
    let evidence: OwnedProcessEvidence;
    try {
      evidence = await operation();
    } catch (error) {
      try {
        persist(stage, guard.evidence(), error instanceof OwnedProcessEvidenceError ? error.reason : 'process-cleanup-operation-failed');
      } catch (persistenceError) {
        throw new AggregateError([error, persistenceError], 'Owned process observation and evidence persistence failed');
      }
      throw error;
    }
    persist(stage, evidence);
  }

  return {
    capture: () => observe('before-teardown', guard.capture),
    finalize: () => observe('after-teardown', guard.finalize),
  };
}

export function createMsnProcessCleanup(
  env: NodeJS.ProcessEnv,
  dependencies: ProcessCleanupDependencies = { provider: createProcessObservationProvider, now: Date.now }
): OwnedMsnProcessCleanup {
  const input = {
    LA_E2E_CLI_MSN_PROCESS_INVOCATION: env.LA_E2E_CLI_MSN_PROCESS_INVOCATION,
    LA_E2E_CLI_WORKSPACE_PARENT: env.LA_E2E_CLI_WORKSPACE_PARENT,
    LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT,
    LA_E2E_CLI_MSN_PROCESS_EVIDENCE_BASE: env.LA_E2E_CLI_MSN_PROCESS_EVIDENCE_BASE,
    LA_E2E_CLI_MSN_PROCESS_OWNER_JSON: env.LA_E2E_CLI_MSN_PROCESS_OWNER_JSON,
  };
  let cleanup: OwnedMsnProcessCleanup | undefined;
  let captureStarted = false;
  let captureCompleted = false;
  let finalized = false;
  return {
    capture: async () => {
      if (captureStarted) {
        throw new OwnedProcessEvidenceError('duplicate-process-capture');
      }
      captureStarted = true;
      cleanup = initializeMsnProcessCleanup(input, dependencies);
      await cleanup.capture();
      captureCompleted = true;
    },
    finalize: async () => {
      if (finalized) {
        throw new OwnedProcessEvidenceError('duplicate-process-finalization');
      }
      finalized = true;
      captureStarted = true;
      if (!cleanup || !captureCompleted) {
        throw new OwnedProcessEvidenceError('missing-live-owned-process-observation');
      }
      await cleanup.finalize();
    },
  };
}
