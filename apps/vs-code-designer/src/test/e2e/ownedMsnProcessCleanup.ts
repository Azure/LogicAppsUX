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

interface OwnedExtensionProcessCleanupInput {
  invocationId: string | undefined;
  workspace: string | undefined;
  dependencies: string | undefined;
  evidenceBase: string | undefined;
  ownerJson: string | undefined;
  allowEmptyCapture?: boolean;
}

interface InitializedOwnedExtensionProcessCleanup extends OwnedMsnProcessCleanup {
  evidence(): OwnedProcessEvidence;
}

function initializeOwnedExtensionProcessCleanup(
  input: OwnedExtensionProcessCleanupInput,
  dependenciesInput: ProcessCleanupDependencies,
  options: {
    evidenceStagePrefix?: string;
    excludedProcesses?: readonly OwnedProcessIdentity[];
  } = {}
): InitializedOwnedExtensionProcessCleanup {
  const invocationId = input.invocationId ?? '';
  const workspace = input.workspace;
  const dependencies = input.dependencies;
  const evidenceBase = input.evidenceBase;
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
    owner: parseOwner(input.ownerJson),
    roots: [
      { kind: 'workspace', directory: workspace },
      { kind: 'dependencies', directory: dependencies },
    ],
    ...provider,
    now: dependenciesInput.now,
    deadline: dependenciesInput.now() + 10_000,
    finalizationBudgetMs: 10_000,
    allowEmptyCapture: input.allowEmptyCapture,
    previouslyCapturedProcesses: [...(options.excludedProcesses ?? [])],
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
    const persistedStage = options.evidenceStagePrefix ? `${options.evidenceStagePrefix}.${stage}` : stage;
    let evidence: OwnedProcessEvidence;
    try {
      evidence = await operation();
    } catch (error) {
      try {
        const reason = error instanceof OwnedProcessEvidenceError ? error.reason : 'process-cleanup-operation-failed';
        const failedEvidence = guard.evidence();
        persist(persistedStage, failedEvidence, reason);
        logOwnedProcessEvidence(persistedStage, failedEvidence, reason);
      } catch (persistenceError) {
        throw new AggregateError([error, persistenceError], 'Owned process observation and evidence persistence failed');
      }
      throw error;
    }
    persist(persistedStage, evidence);
    logOwnedProcessEvidence(persistedStage, evidence);
  }

  return {
    capture: () => observe('before-teardown', guard.capture),
    finalize: () => observe('after-teardown', guard.finalize),
    evidence: guard.evidence,
  };
}

function logOwnedProcessEvidence(stage: string, evidence: OwnedProcessEvidence, failureReason?: string): void {
  console.log(
    `[owned-process-cleanup] ${JSON.stringify({
      stage,
      invocationId: evidence.invocationId,
      observedPids: evidence.observedProcesses.map((record) => record.pid),
      actionPids: evidence.actions.map((action) => action.pid),
      observations: evidence.observations,
      processExitVerified: evidence.processExitVerified,
      filesystemCleanupVerified: evidence.filesystemCleanupVerified,
      ...(failureReason ? { failureReason } : {}),
    })}`
  );
}

export function createOwnedExtensionProcessCleanup(
  input: OwnedExtensionProcessCleanupInput,
  dependencies: ProcessCleanupDependencies = { provider: createProcessObservationProvider, now: Date.now }
): OwnedMsnProcessCleanup {
  const boundInput = { ...input };
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
      cleanup = initializeOwnedExtensionProcessCleanup(boundInput, dependencies);
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

export function createMsnProcessCleanup(
  env: NodeJS.ProcessEnv,
  dependencies: ProcessCleanupDependencies = { provider: createProcessObservationProvider, now: Date.now }
): OwnedMsnProcessCleanup {
  return createOwnedExtensionProcessCleanup(
    {
      invocationId: env.LA_E2E_CLI_MSN_PROCESS_INVOCATION,
      workspace: env.LA_E2E_CLI_WORKSPACE_PARENT,
      dependencies: env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT,
      evidenceBase: env.LA_E2E_CLI_MSN_PROCESS_EVIDENCE_BASE,
      ownerJson: env.LA_E2E_CLI_MSN_PROCESS_OWNER_JSON,
    },
    dependencies
  );
}

export function createHttpTimeoutProcessCleanup(
  env: NodeJS.ProcessEnv,
  dependencies: ProcessCleanupDependencies = { provider: createProcessObservationProvider, now: Date.now }
): OwnedMsnProcessCleanup {
  const input = {
    invocationId: env.LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_INVOCATION,
    workspace: env.LA_E2E_CLI_WORKSPACE_PARENT,
    dependencies: env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT,
    evidenceBase: env.LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_EVIDENCE_BASE,
    ownerJson: env.LA_E2E_CLI_HTTP_TIMEOUT_PROCESS_OWNER_JSON,
  };
  const captures: InitializedOwnedExtensionProcessCleanup[] = [];
  const observedProcesses: OwnedProcessIdentity[] = [];
  let finalized = false;
  return {
    captureAtTeardown: false,
    capture: async () => {
      if (finalized) {
        throw new OwnedProcessEvidenceError('process-capture-after-finalization');
      }
      if (captures.length >= 2) {
        throw new OwnedProcessEvidenceError('too-many-http-runtime-captures');
      }
      const cleanup = initializeOwnedExtensionProcessCleanup(input, dependencies, {
        evidenceStagePrefix: `runtime-${captures.length + 1}`,
        excludedProcesses: observedProcesses,
      });
      await cleanup.capture();
      const evidence = cleanup.evidence();
      captures.push(cleanup);
      observedProcesses.push(...evidence.observedProcesses);
    },
    finalize: async () => {
      if (finalized) {
        throw new OwnedProcessEvidenceError('duplicate-process-finalization');
      }
      finalized = true;
      if (captures.length === 0) {
        throw new OwnedProcessEvidenceError('missing-live-owned-process-observation');
      }
      const errors: unknown[] = [];
      for (const cleanup of [...captures].reverse()) {
        try {
          await cleanup.finalize();
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Owned HTTP runtime process finalization failed');
      }
    },
  };
}
