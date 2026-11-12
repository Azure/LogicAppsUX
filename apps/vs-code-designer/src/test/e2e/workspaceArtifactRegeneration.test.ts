/**
 * Regular-workbench supplement to the official CLI wizard host.
 * Registered by run-e2e-cli.js --workspace-artifact-regeneration, not standalone
 * Mocha or an extension-host dialog mock. Each reopen uses the creating host's
 * admitted Code executable, prepared extensions, and original .code-workspace.
 */
import * as assert from 'assert';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { setOperationDiagnosticScope } from './operationDiagnostics';
import { createDiagnosticProducer, diagnosticBinding, fileDiagnosticSnapshot } from '../../../scripts/e2e-cli-diagnostics';
import * as fs from 'fs';
import * as path from 'path';
import { type CdpConnection, waitForDevToolsActivePort } from './cdpClient';
import { clickPoint, type CdpEvaluator } from './cdpFormHelpers';
import { connectToOwnedRegularWorkbench, readRegularWorkbenchOwnership } from './workbenchCdpActions';
import { readWorkbenchPrompts, revealRetainedWorkbenchNotifications, revealWorkbenchPromptOption } from './workbenchPrompts';
import { captureCdpScreenshot } from './screenshot';
import {
  armRegenerationProbe,
  finishRegenerationProductCoverage,
  type RegenerationProbe,
} from './workspaceArtifactRegenerationDiagnostics';
import {
  type RegenerationInputTracker,
  RegenerationObservation,
  regenerationPromptObservationForLog,
} from './workspaceArtifactRegenerationObservation';
import {
  assertRegenerationComplete,
  assertRegenerationPromptObservation,
  assertRegenerationNonTargets,
  assertSilentRegenerationObservation,
  assertTemplateContracts,
  buildRegenerationPhaseResults,
  captureRegenerationSnapshot,
  captureTemplateContracts,
  confirmRegenerationPromptSequence,
  deleteRegenerationTargets,
  getMissingRegenerationInitializationFiles,
  regenerationCases,
  regenerationDeadline,
  regenerationPhaseIds,
  remainingRegenerationBudget,
  selectRegenerationOverwriteYes,
  selectRegenerationYes,
  type RegenerationDeadline,
  type RegenerationHostPhase,
  type RegenerationInteraction,
  type RegenerationPromptObservation,
  type RegenerationSnapshot,
} from './workspaceArtifactRegeneration';
import { captureRequiredCancelScreenshot, closeWorkspacePromptCancelWindow } from './workspacePromptCancel';
import {
  assertRegenerationRuntimeProfile,
  verifyRegenerationRuntimeSettings,
  writeRegenerationRuntimeProfile,
  type RegenerationRuntimeBinding,
  type RegenerationRuntimeHandoff,
} from './workspaceArtifactRegenerationRuntime';

interface RegenerationContext extends RegenerationRuntimeBinding {
  workspaceParent: string;
  root: string;
  resultPath: string;
}

interface RegenerationHandoff {
  workspace: { appDir: string; workspaceFilePath: string; workflowJsonPath: string };
  launch: { executable: string; sha256: string; version: string; extensionsDir: string };
  runtimeSettings: RegenerationRuntimeHandoff;
}

export { buildRegenerationPhaseResults };

export interface RegenerationResult {
  schemaVersion: 1;
  suiteId: 'workspaceArtifactRegeneration';
  scenario: 'workspace-artifact-regeneration';
  invocation: string;
  identity: Record<string, string>;
  code: { version: string; sha256: string };
  observationPassed: boolean;
  originalCodeClose: RegenerationHostPhase['close'];
  hosts: RegenerationHostPhase[];
  observations: Array<{
    name: string;
    targets: readonly string[];
    interaction: RegenerationInteraction;
    realYesMouseInput: boolean;
    realOverwriteYesMouseInput: boolean;
    initializationYesCount: number;
    overwriteYesCount: number;
    before: RegenerationSnapshot;
    after: RegenerationSnapshot;
    freshReopen: true;
  }>;
  plannedCases: string[];
  errors: string[];
  cleanup?: { verified: boolean };
  complete: boolean;
}

function boundedConnection(cdp: CdpConnection, phase: RegenerationDeadline, input?: RegenerationInputTracker) {
  return {
    targetId: cdp.targetId,
    targetUrl: cdp.targetUrl,
    targetTitle: cdp.targetTitle,
    get contextGeneration() {
      return cdp.contextGeneration;
    },
    getExecutionContextIds: () => cdp.getExecutionContextIds(),
    getExecutionContextFrameId: (contextId: number) => cdp.getExecutionContextFrameId(contextId),
    evaluate: <T>(contextId: number | undefined, expression: string, options?: { timeoutMs?: number }) =>
      cdp.evaluate<T>(contextId, expression, {
        timeoutMs: Math.min(options?.timeoutMs ?? 1500, remainingRegenerationBudget(phase)),
      }),
    send: (method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }) => {
      const request = () =>
        cdp.send(method, params, { timeoutMs: Math.min(options?.timeoutMs ?? 1500, remainingRegenerationBudget(phase)) });
      return input ? input.send(method, request) : request();
    },
  };
}

function diagnosticConnection(cdp: CdpConnection, deadline: number, input: RegenerationInputTracker): CdpEvaluator {
  const budget = (requested = 1000) => Math.max(1, Math.min(requested, deadline - Date.now()));
  return {
    targetId: cdp.targetId,
    get contextGeneration() {
      return cdp.contextGeneration;
    },
    evaluate: (contextId, expression, options) => cdp.evaluate(contextId, expression, { timeoutMs: budget(options?.timeoutMs) }),
    send: (method, params, options) => input.send(method, () => cdp.send(method, params, { timeoutMs: budget(options?.timeoutMs) })),
  };
}

async function captureRegenerationFailureDiagnostics(
  cdp: CdpConnection | undefined,
  diagnostics: RegenerationObservation,
  context: RegenerationContext,
  handoff: RegenerationHandoff,
  phase: RegenerationDeadline,
  decisionAt: number
): Promise<void> {
  const first = diagnostics.screenshots.beforeTeardown;
  const center = diagnostics.screenshots.notificationCenter;
  if (!cdp) {
    first.reason = 'no-owned-target';
    center.status = 'skipped';
    center.reason = 'no-owned-target';
    return;
  }
  const deadline = Date.now() + 10000;
  const capture = async (target: typeof first, suffix: 'failure' | 'notification-center') => {
    const checkpoint = `workspace-regeneration-${phase.phase}-${suffix}`;
    target.checkpoint = checkpoint;
    target.postDeadline = Date.now() >= phase.deadline;
    let failed = false;
    try {
      const file = await captureCdpScreenshot(cdp, checkpoint, {
        classification: 'diagnostic',
        captureBeforeObservation: true,
        expectation: { kind: 'diagnostic', label: checkpoint, reason: 'regeneration-phase-failure' },
        deadlineMs: Math.min(deadline, Date.now() + 2000),
        timeoutMs: 2000,
        allowWindowsDiagnosticFallback: false,
        diagnosticContext: {
          operationId: `workspaceArtifactRegeneration-${phase.phase}-${suffix}`,
          nativeInvocation: context.invocation,
          phase: phase.phase,
        },
        onDiagnosticFailure: () => {
          failed = true;
        },
        onImmediateCaptureStart: (startedAt) => {
          target.postDeadline = startedAt >= phase.deadline;
        },
        onOrderedEvidenceStatus: (status) => {
          target.registration = status;
        },
      });
      target.status = file ? 'captured' : 'unavailable';
      target.reason = file ? (failed ? 'captured-metadata-incomplete' : 'captured') : 'capture-unavailable';
    } catch {
      target.status = 'unavailable';
      target.reason = 'capture-failed';
    }
  };
  // Capture before any optional post-failure input or CDP disposal.
  await capture(first, 'failure');
  const state = await diagnostics.stopAndSample();
  const skip = (reason: string) => {
    center.status = 'skipped';
    center.reason = reason;
  };
  if (Date.now() >= deadline) {
    return skip('diagnostic-budget-exhausted');
  }
  if (diagnostics.input.uncertain || diagnostics.input.pending > 0) {
    return skip('uncertain-input');
  }
  if (!state || !diagnostics.hasSampleSince(decisionAt)) {
    return skip('current-state-unavailable');
  }
  if (!state.shellOwned || !state.documentVisible || !state.documentFocused) {
    return skip('workbench-not-active');
  }
  if (state.documentChanged) {
    return skip('document-changed');
  }
  if (state.blockingUiVisible || state.truncated) {
    return skip('blocking-or-ambiguous-ui');
  }
  if (!state.centerVisible) {
    try {
      const revealDeadline = Math.min(deadline, Date.now() + 1800);
      await revealRetainedWorkbenchNotifications(
        diagnosticConnection(cdp, revealDeadline, diagnostics.input),
        { workspaceFilePath: handoff.workspace.workspaceFilePath, rootPaths: [handoff.workspace.appDir] },
        revealDeadline
      );
      const revealedState = await diagnostics.stopAndSample();
      if (
        !revealedState ||
        !diagnostics.hasSampleSince(decisionAt) ||
        !revealedState.shellOwned ||
        !revealedState.documentVisible ||
        !revealedState.documentFocused ||
        revealedState.documentChanged ||
        revealedState.blockingUiVisible ||
        revealedState.truncated ||
        !revealedState.centerVisible
      ) {
        return skip('notification-center-reveal-failed');
      }
    } catch {
      return skip('notification-center-reveal-failed');
    }
  }
  if (Date.now() >= deadline || diagnostics.input.uncertain || diagnostics.input.pending > 0) {
    return skip('diagnostic-budget-or-input-uncertain');
  }
  await capture(center, 'notification-center');
}

async function readRegenerationWorkbench(cdp: CdpEvaluator, workspaceFile: string, appDir: string): Promise<RegenerationPromptObservation> {
  const expectation = { workspaceFilePath: workspaceFile, rootPaths: [appDir] };
  const [containers, ownership] = await Promise.all([readWorkbenchPrompts(cdp), readRegularWorkbenchOwnership(cdp, expectation)]);
  const failure = containers.some((container) => /DialogService:.*refused to show dialog/i.test(container.text))
    ? 'Stock Code refused a required regeneration dialog'
    : undefined;
  return {
    containers,
    ready: ownership.shellOwned,
    timeOrigin: ownership.timeOrigin,
    ...(failure ? { failure } : {}),
  };
}

async function poll(phase: RegenerationDeadline): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, Math.min(100, remainingRegenerationBudget(phase))));
}

async function waitForStableFiles(
  cdp: CdpEvaluator,
  context: RegenerationContext,
  handoff: RegenerationHandoff,
  phase: RegenerationDeadline,
  check: (snapshot: RegenerationSnapshot) => void,
  settleMs: number
): Promise<RegenerationSnapshot> {
  let previous: string | undefined;
  let stableSince: number | undefined;
  let timeOrigin: number | undefined;
  const { appDir, workspaceFilePath } = handoff.workspace;
  while (Date.now() < phase.deadline) {
    const view = await readRegenerationWorkbench(cdp, workspaceFilePath, appDir);
    remainingRegenerationBudget(phase);
    assertRegenerationPromptObservation(view);
    if (view.ready) {
      timeOrigin ??= view.timeOrigin;
      assert.strictEqual(view.timeOrigin, timeOrigin, 'No incidental workbench reload may replace the observed regeneration phase');
      assert.strictEqual(selectRegenerationYes(view.containers, appDir).visible, false, 'Initialization prompt must be dismissed/absent');
      assert.strictEqual(selectRegenerationOverwriteYes(view.containers).visible, false, 'Overwrite confirmation must be dismissed/absent');
      const snapshot = captureRegenerationSnapshot(context.workspaceParent, path.dirname(workspaceFilePath));
      check(snapshot);
      const serialized = JSON.stringify(snapshot);
      if (previous !== serialized) {
        previous = serialized;
        stableSince = Date.now();
      } else if (stableSince !== undefined && Date.now() - stableSince >= settleMs) {
        remainingRegenerationBudget(phase);
        return snapshot;
      }
    }
    await poll(phase);
  }
  throw new Error(`Regeneration ${phase.phase}: generated files/workbench did not settle before the original deadline`);
}

function assertAcceptedScreenshot(root: string, name: string): void {
  const sidecar: { checkpoint?: string; classification?: string; verdict?: string } = JSON.parse(
    fs.readFileSync(path.join(root, 'screenshots', `${name}.json`), 'utf8')
  );
  assert.strictEqual(sidecar.checkpoint, name);
  assert.strictEqual(sidecar.classification, 'evidence');
  assert.strictEqual(sidecar.verdict, 'accepted', 'Regeneration requires accepted workbench evidence, not a diagnostic fallback');
}

async function captureRegenerationEvidence(cdp: CdpConnection, context: RegenerationContext, phase: RegenerationDeadline, name: string) {
  await captureRequiredCancelScreenshot(boundedConnection(cdp, phase), name, phase.deadline);
  remainingRegenerationBudget(phase);
  assertAcceptedScreenshot(context.root, name);
}

async function runFreshRegenerationHost(
  context: RegenerationContext,
  handoff: RegenerationHandoff,
  env: NodeJS.ProcessEnv,
  result: RegenerationResult,
  phaseName: string,
  observe: (cdp: CdpConnection, phase: RegenerationDeadline, diagnostics?: RegenerationObservation) => Promise<void>
): Promise<void> {
  const phase = regenerationDeadline(phaseName);
  setOperationDiagnosticScope({ suite: 'workspaceArtifactRegeneration', phase: phaseName });
  const host: RegenerationHostPhase = { phase: phaseName, close: null, observationPassed: false, errors: [] };
  result.hosts.push(host);
  result.originalCodeClose = null;
  const probe = armRegenerationProbe({
    root: context.root,
    phase: phaseName,
    invocation: context.invocation,
    identity: context.identity,
    env,
  });
  const diagnostics = probe.requested
    ? new RegenerationObservation(
        context.root,
        phaseName,
        context.invocation,
        phase.deadline,
        { workspaceFilePath: handoff.workspace.workspaceFilePath, rootPaths: [handoff.workspace.appDir] },
        handoff.workspace.appDir
      )
    : undefined;
  diagnostics?.boundary('phase-start');
  diagnostics?.boundary(probe.receipt ? 'arm-ready' : 'arm-unavailable');
  let diagnosticsFinalized = false;
  const finalizeDiagnostics = async (cdp: CdpConnection | undefined, observed: boolean) => {
    if (!diagnostics || diagnosticsFinalized) {
      return;
    }
    diagnosticsFinalized = true;
    const decisionAt = Date.now();
    diagnostics.boundary('decision');
    try {
      if (observed) {
        diagnostics.screenshots.beforeTeardown.status = 'skipped';
        diagnostics.screenshots.beforeTeardown.reason = 'observation-succeeded';
        diagnostics.screenshots.notificationCenter.status = 'skipped';
        diagnostics.screenshots.notificationCenter.reason = 'observation-succeeded';
        await diagnostics.stopAndSample();
      } else {
        await captureRegenerationFailureDiagnostics(cdp, diagnostics, context, handoff, phase, decisionAt);
      }
    } catch {
      // The original native failure and existing acceptance remain authoritative.
      if (diagnostics.screenshots.beforeTeardown.reason === 'not-attempted') {
        diagnostics.screenshots.beforeTeardown.reason = 'diagnostic-collection-failed';
      }
      if (diagnostics.screenshots.notificationCenter.reason === 'not-attempted') {
        diagnostics.screenshots.notificationCenter.reason = 'diagnostic-collection-failed';
      }
    }
    try {
      await finishRegenerationProductCoverage(probe, decisionAt);
    } catch {
      console.warn('[workspace-regeneration-diagnostics] product-collection-unavailable');
    }
    try {
      diagnostics.boundary('teardown-start');
      await diagnostics.finish(decisionAt);
    } catch {
      console.warn('[workspace-regeneration-diagnostics] summary-unavailable');
    }
  };
  try {
    await runFreshRegenerationHostCore(
      context,
      handoff,
      env,
      result,
      phaseName,
      phase,
      host,
      probe,
      diagnostics,
      observe,
      finalizeDiagnostics
    );
  } finally {
    // Setup can fail before a child or an owned CDP connection exists.
    await finalizeDiagnostics(undefined, false);
  }
}

async function runFreshRegenerationHostCore(
  context: RegenerationContext,
  handoff: RegenerationHandoff,
  env: NodeJS.ProcessEnv,
  result: RegenerationResult,
  phaseName: string,
  phase: RegenerationDeadline,
  host: RegenerationHostPhase,
  probe: RegenerationProbe,
  diagnostics: RegenerationObservation | undefined,
  observe: (cdp: CdpConnection, phase: RegenerationDeadline, diagnostics?: RegenerationObservation) => Promise<void>,
  finalizeDiagnostics: (cdp: CdpConnection | undefined, observed: boolean) => Promise<void>
): Promise<void> {
  const profile = path.join(
    env.LA_E2E_CLI_USER_DATA_PARENT || path.dirname(context.root),
    `rg-${createHash('sha256').update(`${context.invocation}/${phaseName}`).digest('hex').slice(0, 8)}`
  );
  assert.ok(!fs.existsSync(profile), 'Every regeneration/reopen requires a fresh regular Code profile');
  if (process.platform === 'linux') {
    assert.ok(
      Buffer.byteLength(path.join(profile, 'main.sock'), 'utf8') < 100,
      'Actual regeneration profile socket path exceeds Linux limit'
    );
  }
  const profileSettingsPath = writeRegenerationRuntimeProfile(profile, handoff.runtimeSettings, context);
  remainingRegenerationBudget(phase);
  const previousPort = process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
  const trace = createDiagnosticProducer({
    producer: 'regeneration-owned-observer',
    binding: { ...diagnosticBinding(env), suite: 'workspaceArtifactRegeneration', phase: phaseName },
    sink: (line) => fs.appendFileSync(path.join(context.root, 'writer-events.jsonl'), line),
  });
  // Watch only the exact owned .gitignore. Watcher changes are unattributed;
  // they never authorize changing a strict non-target assertion.
  let watcher: fs.FSWatcher | undefined;
  const gitignore = path.join(handoff.workspace.appDir, '.gitignore');
  try {
    trace.emit('gitignore-watcher-baseline-unknown-writer', 'end', { state: fileDiagnosticSnapshot(gitignore) });
    watcher = fs.watch(gitignore, (event) =>
      trace.emit(event === 'rename' ? 'gitignore-watch-rename-unknown-writer' : 'gitignore-watch-change-unknown-writer', 'end', {
        state: fileDiagnosticSnapshot(gitignore),
      })
    );
    watcher.on('error', (error) => trace.emit('gitignore-watch-error', 'failure', { error }));
  } catch (error) {
    trace.emit('gitignore-watch-unavailable', 'failure', { error });
  }
  const log = fs.createWriteStream(path.join(context.root, `${phaseName}-code.log`), { flags: 'wx' });
  const errors: unknown[] = [];
  log.on('error', (error) => errors.push(error));
  probe.spawnRequestedAt = Date.now();
  diagnostics?.boundary('spawn-requested');
  const child = spawn(
    handoff.launch.executable,
    [
      ...(process.platform === 'linux' ? ['--password-store=gnome-libsecret'] : []),
      `--user-data-dir=${profile}`,
      `--extensions-dir=${handoff.launch.extensionsDir}`,
      `--extensionDevelopmentPath=${path.join(__dirname, '..', '..', '..', 'dist')}`,
      '--disable-workspace-trust',
      '--disable-updates',
      '--disable-restore-windows',
      '--disable-gpu',
      '--enable-smoke-test-driver',
      '--skip-welcome',
      '--skip-release-notes',
      '--locale=en-US',
      '--new-window',
      '--window-size=1920,1080',
      '--remote-debugging-port=0',
      '--remote-debugging-address=127.0.0.1',
      handoff.workspace.workspaceFilePath,
    ],
    {
      env: {
        ...probe.childEnv,
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '0',
        VSCODE_RUNNING_TESTS: '1',
        LA_E2E_CLI_REGENERATION_WRITER_EVENTS: path.join(context.root, 'writer-events.jsonl'),
        LA_E2E_CLI_DIAGNOSTIC_PHASE: phaseName,
        LA_E2E_CLI_SUITE_ID: 'workspaceArtifactRegeneration',
        DEBUGTELEMETRY: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  child.once('spawn', () => {
    probe.spawnObservedAt = Date.now();
    diagnostics?.boundary('spawn-observed');
  });
  const completion = new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      host.close = { code, signal };
      result.originalCodeClose = host.close;
      resolve();
    });
  });
  // Attach a handler immediately; a launch failure must not become an unhandled rejection.
  completion.catch((error) => errors.push(error));
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (data: Buffer) => log.write(data));
  }
  let cdp: CdpConnection | undefined;
  let observed = false;
  let observationSettled = false;
  try {
    diagnostics?.boundary('attach-start');
    const cdpPort = await waitForDevToolsActivePort(profile, phase.deadline);
    process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = String(cdpPort);
    const ownedWorkbench = await connectToOwnedRegularWorkbench({
      expectation: {
        workspaceFilePath: handoff.workspace.workspaceFilePath,
        rootPaths: [handoff.workspace.appDir],
      },
      deadline: phase.deadline,
      connectionTimeoutMs: Math.min(15000, remainingRegenerationBudget(phase)),
      activate: false,
      onConnection: diagnostics ? (connection) => diagnostics.onConnection(connection) : undefined,
    });
    cdp = ownedWorkbench.cdp;
    diagnostics?.start(cdp, ownedWorkbench.state.timeOrigin);
    assertRegenerationRuntimeProfile(profileSettingsPath, handoff.runtimeSettings);
    const observation = observe(cdp, phase, diagnostics).finally(() => {
      observationSettled = true;
    });
    await Promise.race([
      observation,
      completion.then(() => {
        throw new Error('Regular Code closed before the regeneration observation finished');
      }),
    ]);
    assertRegenerationRuntimeProfile(profileSettingsPath, handoff.runtimeSettings);
    remainingRegenerationBudget(phase);
    observed = true;
    host.observationPassed = true;
  } catch (error) {
    errors.push(error);
  } finally {
    if (diagnostics && cdp && !observationSettled) {
      diagnostics.input.uncertain = true;
    }
    await finalizeDiagnostics(cdp, observed);
    watcher?.close();
    cdp?.dispose();
    if (!host.close) {
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          (async () => {
            await closeWorkspacePromptCancelWindow(!observed);
            await completion;
          })(),
          new Promise<void>((_resolve, reject) => {
            timer = setTimeout(() => reject(new Error('Ordinary Code Close Window was not confirmed; retain the wizard fixture')), 10000);
          }),
        ]);
      } catch (error) {
        errors.push(error);
      } finally {
        clearTimeout(timer);
      }
    }
    try {
      await new Promise<void>((resolve, reject) => {
        log.once('error', reject);
        log.end(resolve);
      });
    } catch (error) {
      errors.push(error);
    }
    // Keep the actual profile for the existing runner's sanitized diagnostic collector.
    console.log(`[workspace-regeneration] ${JSON.stringify({ phase: phaseName, profile, close: host.close })}`);
    fs.writeFileSync(path.join(context.root, `${phaseName}-profile.json`), `${JSON.stringify({ profile, phase: phaseName })}\n`);
  }
  if (host.close?.code !== 0 || host.close.signal !== null) {
    errors.push(new Error(`Regeneration ${phaseName}: ordinary Code exit 0/null is required`));
  }
  try {
    assertRegenerationRuntimeProfile(profileSettingsPath, handoff.runtimeSettings);
    verifyRegenerationRuntimeSettings(handoff.runtimeSettings, context);
  } catch (error) {
    errors.push(error);
  }
  host.errors = errors.map(String);
  if (previousPort === undefined) {
    delete process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
  } else {
    process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = previousPort;
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, `Regeneration ${phaseName} failed: ${errors.map(String).join('; ')}`);
  }
}

export async function runWorkspaceArtifactRegeneration(
  context: RegenerationContext,
  handoff: RegenerationHandoff,
  env: NodeJS.ProcessEnv
): Promise<RegenerationResult> {
  const result: RegenerationResult = {
    schemaVersion: 1,
    suiteId: 'workspaceArtifactRegeneration',
    scenario: 'workspace-artifact-regeneration',
    invocation: context.invocation,
    identity: context.identity,
    code: { version: handoff.launch.version, sha256: handoff.launch.sha256 },
    observationPassed: false,
    originalCodeClose: null,
    hosts: [],
    observations: [],
    plannedCases: regenerationCases.map((entry) => entry.name),
    errors: [],
    complete: false,
  };
  const { appDir, workspaceFilePath } = handoff.workspace;
  verifyRegenerationRuntimeSettings(handoff.runtimeSettings, context);
  const workspaceDir = path.dirname(workspaceFilePath);
  const template = captureTemplateContracts(appDir);
  const wizardSnapshot = captureRegenerationSnapshot(context.workspaceParent, workspaceDir);
  let baseline: RegenerationSnapshot | undefined;
  try {
    await runFreshRegenerationHost(context, handoff, env, result, 'baseline', async (cdp, phase) => {
      baseline = await waitForStableFiles(
        boundedConnection(cdp, phase),
        context,
        handoff,
        phase,
        (snapshot) => {
          assertTemplateContracts(appDir, template);
          for (const [name, hash] of Object.entries(wizardSnapshot.files)) {
            assert.strictEqual(snapshot.files[name], hash, 'Opening the valid wizard project must preserve original generated file bytes');
          }
        },
        1500
      );
      await captureRegenerationEvidence(cdp, context, phase, 'workspace-regeneration-baseline');
    });
    assert.ok(baseline, 'A real fresh-reopen baseline is required before deletion');
    // The initial ordinary activation may add its own design-time directory. It is
    // now part of the exact invariant; no files/directories are excluded thereafter.
    assert.deepStrictEqual(
      captureRegenerationSnapshot(context.workspaceParent, workspaceDir),
      baseline,
      'Baseline-host closure must not silently replace the captured invariant'
    );
    for (const entry of regenerationCases) {
      const before = baseline;
      const initializationFiles = getMissingRegenerationInitializationFiles(before, workspaceDir, appDir);
      deleteRegenerationTargets(context.workspaceParent, workspaceDir, appDir, entry.targets, before);
      let after: RegenerationSnapshot | undefined;
      let prompts: { initializationYesCount: number; overwriteYesCount: number } | undefined;
      await runFreshRegenerationHost(context, handoff, env, result, entry.name, async (cdp, phase, diagnostics) => {
        const bounded = boundedConnection(cdp, phase, diagnostics?.input);
        await revealRetainedWorkbenchNotifications(bounded, { workspaceFilePath, rootPaths: [appDir] }, phase.deadline);
        const observationsPath = path.join(context.root, `${entry.name}-prompt-observations.jsonl`);
        let previousPromptObservation: string | undefined;
        const read = async () => {
          const observation = await readRegenerationWorkbench(bounded, workspaceFilePath, appDir);
          const missingTargets = entry.targets.filter((target) => !fs.existsSync(path.join(appDir, target)));
          const promptObservation = JSON.stringify(
            regenerationPromptObservationForLog(observation, appDir, missingTargets, Boolean(diagnostics))
          );
          if (promptObservation !== previousPromptObservation) {
            fs.appendFileSync(
              observationsPath,
              `${JSON.stringify({ observedAt: new Date().toISOString(), ...JSON.parse(promptObservation) })}\n`
            );
            previousPromptObservation = promptObservation;
          }
          return observation;
        };
        const healed = () => entry.targets.every((target) => fs.existsSync(path.join(appDir, target)));
        if (entry.interaction === 'prompted') {
          prompts = await confirmRegenerationPromptSequence({
            read,
            appDir,
            phase,
            filesHealed: healed,
            assertBeforeOverwrite: () =>
              assertRegenerationNonTargets(
                before,
                captureRegenerationSnapshot(context.workspaceParent, workspaceDir),
                workspaceDir,
                appDir,
                entry.targets,
                false,
                initializationFiles
              ),
            capture: (kind) =>
              captureRegenerationEvidence(
                cdp,
                context,
                phase,
                `workspace-regeneration-${entry.name}-${kind === 'initialize' ? 'before-yes' : 'before-overwrite-yes'}`
              ),
            revealBlocked: () =>
              revealWorkbenchPromptOption(bounded, `Detected an Azure Logic App project "${appDir}"`, ['Yes'], phase.deadline).then(
                () => undefined
              ),
            click: (point) => clickPoint(bounded, point),
          });
          // Neither Yes is replayed or substituted with an API response. File writes
          // must follow the distinct real overwrite modal, within this same deadline.
          while (Date.now() < phase.deadline && !healed()) {
            await poll(phase);
          }
        } else {
          prompts = { initializationYesCount: 0, overwriteYesCount: 0 };
          while (Date.now() < phase.deadline && !healed()) {
            assertSilentRegenerationObservation(await read(), appDir);
            await poll(phase);
          }
          assertSilentRegenerationObservation(await read(), appDir);
        }
        remainingRegenerationBudget(phase);
        after = await waitForStableFiles(
          bounded,
          context,
          handoff,
          phase,
          (snapshot) => {
            assertTemplateContracts(appDir, template);
            assertRegenerationNonTargets(before, snapshot, workspaceDir, appDir, entry.targets, true, initializationFiles);
            for (const name of initializationFiles) {
              assert.ok(snapshot.files[name], `${name} must be created by the real project-initialization path`);
            }
          },
          1500
        );
        for (const name of initializationFiles) {
          JSON.parse(fs.readFileSync(path.join(workspaceDir, name), 'utf8'));
        }
        await captureRegenerationEvidence(
          cdp,
          context,
          phase,
          `workspace-regeneration-${entry.name}-${entry.interaction === 'prompted' ? 'after-yes' : 'after-repair'}`
        );
      });
      assert.ok(after, 'The product repair path must produce validated, durably written artifacts');
      const expectedYesCount = entry.interaction === 'prompted' ? 1 : 0;
      assert.deepStrictEqual(
        prompts,
        { initializationYesCount: expectedYesCount, overwriteYesCount: expectedYesCount },
        entry.interaction === 'prompted'
          ? 'Exactly one real Yes for each distinct production prompt is required'
          : 'Root artifact repair must remain silent'
      );
      const regenerated = captureRegenerationSnapshot(context.workspaceParent, workspaceDir);
      assert.deepStrictEqual(regenerated, after, 'Ordinary Code closure must not alter the regenerated files');
      await runFreshRegenerationHost(context, handoff, env, result, `${entry.name}-reopen`, async (cdp, phase) => {
        await waitForStableFiles(
          boundedConnection(cdp, phase),
          context,
          handoff,
          phase,
          (snapshot) => {
            assertTemplateContracts(appDir, template);
            assert.deepStrictEqual(snapshot, regenerated, 'Fresh reopen must preserve all target and non-target bytes/entries');
          },
          1500
        );
        await captureRegenerationEvidence(cdp, context, phase, `workspace-regeneration-${entry.name}-reopened`);
      });
      assert.deepStrictEqual(
        captureRegenerationSnapshot(context.workspaceParent, workspaceDir),
        regenerated,
        'Persistence-host closure must leave all files unchanged'
      );
      result.observations.push({
        name: entry.name,
        targets: entry.targets,
        interaction: entry.interaction,
        realYesMouseInput: entry.interaction === 'prompted',
        realOverwriteYesMouseInput: entry.interaction === 'prompted',
        ...prompts,
        before,
        after: regenerated,
        freshReopen: true,
      });
      baseline = regenerated;
    }
    assert.strictEqual(result.observations.length, regenerationCases.length, 'No branch may fall through to success');
    result.observationPassed = true;
  } catch (error) {
    result.errors.push(String(error));
    console.error(`[workspace-regeneration] ${String(error)}`);
  }
  fs.writeFileSync(context.resultPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export function finalizeWorkspaceArtifactRegeneration(
  context: RegenerationContext,
  result: RegenerationResult,
  cleanup: { verified: boolean },
  errors: unknown[]
): void {
  result.cleanup = { verified: cleanup.verified };
  result.errors.push(...errors.map(String));
  result.complete = false;
  fs.writeFileSync(context.resultPath, `${JSON.stringify(result, null, 2)}\n`);
  assertWorkspaceArtifactRegenerationEvidence(context, result);
  assertRegenerationComplete(result);
  result.complete = true;
  fs.writeFileSync(context.resultPath, `${JSON.stringify(result, null, 2)}\n`);
}

export function assertWorkspaceArtifactRegenerationEvidence(
  context: RegenerationContext,
  result: RegenerationResult,
  additionalErrors: unknown[] = []
): void {
  assert.strictEqual(result.observationPassed, true, 'Every required regeneration and fresh-reopen phase must pass');
  assert.deepStrictEqual(result.originalCodeClose, { code: 0, signal: null }, 'Every regular Code host must close ordinarily');
  assert.deepStrictEqual(
    [...result.errors, ...additionalErrors.map(String)],
    [],
    'Required observation, diagnostics and teardown errors must be retained'
  );
  assert.strictEqual(result.observations.length, regenerationCases.length, 'All planned branches must have genuine observations');
  assert.strictEqual(result.hosts.length, 1 + regenerationCases.length * 2, 'Baseline, each real Yes, and each fresh reopen are required');
  assert.deepStrictEqual(
    result.hosts.map((host) => `workspaceArtifactRegeneration:${host.phase}`),
    regenerationPhaseIds.slice(1),
    'Recorded native hosts must match the exact registered order; there is no invented bootstrap'
  );
  for (const host of result.hosts) {
    assert.strictEqual(host.observationPassed, true, 'Every recorded regular Code phase must have its real observation');
    assert.deepStrictEqual(host.errors, [], 'Earlier host observation/teardown errors must remain fatal');
    assert.deepStrictEqual(host.close, { code: 0, signal: null }, 'No failed/unclosed earlier host may be hidden by a later host');
  }
  for (const entry of regenerationCases) {
    if (entry.interaction === 'prompted') {
      assertAcceptedScreenshot(context.root, `workspace-regeneration-${entry.name}-before-yes`);
      assertAcceptedScreenshot(context.root, `workspace-regeneration-${entry.name}-before-overwrite-yes`);
      assertAcceptedScreenshot(context.root, `workspace-regeneration-${entry.name}-after-yes`);
    } else {
      assertAcceptedScreenshot(context.root, `workspace-regeneration-${entry.name}-after-repair`);
    }
    assertAcceptedScreenshot(context.root, `workspace-regeneration-${entry.name}-reopened`);
  }
  for (const observation of result.observations) {
    const prompted = observation.interaction === 'prompted';
    assert.strictEqual(observation.realYesMouseInput, prompted);
    assert.strictEqual(observation.realOverwriteYesMouseInput, prompted);
    assert.strictEqual(observation.initializationYesCount, prompted ? 1 : 0);
    assert.strictEqual(observation.overwriteYesCount, prompted ? 1 : 0);
  }
  assertAcceptedScreenshot(context.root, 'workspace-regeneration-baseline');
  const profileLogIndices = walkFiles(path.join(context.root, 'vscode-logs')).filter(
    (file) => path.basename(file) === 'profile-log-index.md'
  );
  for (const phaseId of regenerationPhaseIds.slice(1)) {
    const phase = phaseId.slice('workspaceArtifactRegeneration:'.length);
    assert.ok(
      profileLogIndices.some((file) => fs.readFileSync(file, 'utf8').includes(`Phase: ${phase}\n`)),
      `Required sanitized profile diagnostics are missing for ${phase}`
    );
  }
  for (const host of result.hosts) {
    const codeLog = path.join(context.root, `${host.phase}-code.log`);
    assert.ok(fs.statSync(codeLog).isFile(), `Required Code diagnostics are missing for ${host.phase}`);
  }
}

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(root, entry.name);
    return entry.isDirectory() ? walkFiles(candidate) : [candidate];
  });
}
