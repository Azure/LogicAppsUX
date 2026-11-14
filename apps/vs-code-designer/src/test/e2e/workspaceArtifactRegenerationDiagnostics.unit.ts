import * as assert from 'assert';
import { createHash, createHmac, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CdpConnection, CdpConsoleDiagnostic } from './cdpClient';
import type { CdpEvaluator } from './cdpFormHelpers';
import { pinPhysicalWorkspacePaths, type LivePhysicalWorkspace } from './physicalWorkspaceIdentity';
import {
  armRegenerationProbe,
  assessRegenerationProductCoverage,
  finishRegenerationProductCoverage,
  regenerationProbeVariables,
  type RegenerationProbe,
  validRegenerationProductPayload,
} from './workspaceArtifactRegenerationDiagnostics';
import {
  activateRetainedRegenerationInitialization,
  RegenerationInputTracker,
  RegenerationObservation,
  inspectRegenerationNotificationCenter,
  isValidNotificationCenterInspection,
  notificationCenterAffordanceScript,
  notificationCenterScrollStateScript,
  regenerationPromptObservationForLog,
  regenerationDiagnosticDomScript,
  regenerationDiagnosticSampleExpression,
  samplePhysicalRegenerationWorkbench,
  sanitizeRegenerationDiagnosticState,
  summarizeRegenerationPromptObservation,
  type RawWorkbenchState,
} from './workspaceArtifactRegenerationObservation';
import { readRegularWorkbenchOwnership } from './workbenchCdpActions';

export async function runRegenerationDiagnosticsControls(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regeneration-diagnostics-'));
  try {
    const invocation = randomUUID();
    const identity = { source: 'private-source-value', run: 'private-run-value', job: 'private-job-value', platform: process.platform };
    const inherited: NodeJS.ProcessEnv = {
      LA_E2E_CLI_REGENERATION_PROBE: '1',
      LA_E2E_CLI_REGENERATION_TRACE_FILE: 'private-inherited-path',
      LA_E2E_CLI_REGENERATION_TRACE_PHASE: 'private-inherited-phase',
      LA_E2E_CLI_REGENERATION_TRACE_INVOCATION: 'private-inherited-invocation',
      LA_E2E_CLI_DIAGNOSTIC_ONLY: 'false',
      la_e2e_cli_regeneration_trace_file: 'private-lowercase-path',
      UNIT_ONLY: 'kept',
    };
    const canonical = armRegenerationProbe({ root, phase: 'baseline', invocation, identity, env: inherited });
    assert.strictEqual(canonical.requested, false);
    for (const variable of regenerationProbeVariables) {
      assert.strictEqual(canonical.childEnv[variable], undefined);
    }
    assert.strictEqual(canonical.childEnv.LA_E2E_CLI_DIAGNOSTIC_ONLY, undefined);
    assert.strictEqual(canonical.childEnv.la_e2e_cli_regeneration_trace_file, undefined);
    assert.strictEqual(canonical.childEnv.UNIT_ONLY, 'kept');
    assert.strictEqual(inherited.LA_E2E_CLI_REGENERATION_TRACE_FILE, 'private-inherited-path', 'Never mutate the parent environment');
    assert.deepStrictEqual(fs.readdirSync(root), [], 'Canonical launches must not arm product collection');

    const probe = armRegenerationProbe({
      root,
      phase: 'vscode-single',
      invocation,
      identity,
      env: { ...inherited, LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true' },
    });
    assert.ok(probe.receipt && probe.tracePath && probe.receiptPath);
    assert.strictEqual(probe.childEnv.LA_E2E_CLI_REGENERATION_PROBE, '1');
    assert.strictEqual(probe.childEnv.LA_E2E_CLI_REGENERATION_TRACE_FILE, probe.tracePath);
    assert.strictEqual(probe.childEnv.LA_E2E_CLI_REGENERATION_TRACE_PHASE, 'vscode-single');
    assert.strictEqual(probe.childEnv.LA_E2E_CLI_REGENERATION_TRACE_INVOCATION, invocation);
    assert.strictEqual(probe.childEnv.LA_E2E_CLI_DIAGNOSTIC_ONLY, undefined);
    assert.strictEqual(fs.statSync(probe.tracePath).size, 0, 'Trace is exclusively precreated before spawn');
    const receiptBytes = fs.readFileSync(probe.receiptPath, 'utf8');
    assert.ok(!receiptBytes.includes('private-'));
    assert.ok(!receiptBytes.includes(root));
    assert.strictEqual(JSON.parse(receiptBytes).armId, probe.receipt.armId);
    assert.match(probe.receipt.identityBinding, /^[0-9a-f]{64}$/);

    const armedAt = Date.parse(probe.receipt.armedAtUtc);
    probe.spawnRequestedAt = armedAt;
    probe.spawnObservedAt = armedAt + 1;
    const decisionAt = armedAt + 100;
    const variants: [string, Record<string, unknown> | undefined][] = [
      ['activation-returned', { initialInvocationState: 'pending' }],
      ['activation-workspace-setup-start', undefined],
      ['activation-workspace-setup-returned', undefined],
      ['activation-project-discovery-start', undefined],
      ['activation-project-files-start', undefined],
      ['activation-project-files-returned', undefined],
      ['activation-vscode-check-scheduled', undefined],
      ['activation-vscode-check-entered', undefined],
      ['workspace-listener-registered', undefined],
      ['workspace-change-entered', undefined],
      ['workspace-change-returned', undefined],
      ['workspace-catchup-start', undefined],
      ['workspace-catchup-returned', undefined],
      ['consistency-check-entered', undefined],
      ['consistency-check-returned', undefined],
      ['activation-workspace', { folderCount: 1 }],
      ['activation-project-discovery-returned', { projectCount: 1 }],
      ['consistency-project-discovery-returned', { projectCount: 1 }],
      ['workspace-catchup-decision', { needed: true }],
      ['consistency-check-skipped', { reason: 'no-projects' }],
      ['consistency-setting', { enabled: true }],
      ['initialization-check', { firstMissing: 'tasks', hasLanguage: true, hasFuncVersion: false }],
      ['ensure-vscode-files-entered', { origin: 'activation-initial', invocationSequence: 1, overlapCount: 0 }],
      ['ensure-vscode-files-entered', { origin: 'workspace-change', invocationSequence: 2, overlapCount: 1 }],
      ['ensure-vscode-files-returned', { origin: 'workspace-change', invocationSequence: 2, overlapCount: 1 }],
      ['ensure-vscode-files-error', { origin: 'catch-up', invocationSequence: 3, overlapCount: 1, errorKind: 'user-cancelled' }],
      ['warning-call-entered', { kind: 'initialization', warningId: 1, checkId: 1 }],
      ['warning-call-returned', { kind: 'initialization', warningId: 1, checkId: 1, awaitable: true }],
      ['warning-result', { kind: 'initialization', warningId: 1, checkId: 1, result: 'dont-warn-again', durationMs: 42 }],
      ['warning-result', { kind: 'outdated', warningId: 2, checkId: 2, result: 'undefined', durationMs: 43 }],
      ['warning-error', { kind: 'overwrite', warningId: 3, checkId: 1, errorKind: 'non-error', durationMs: 44 }],
    ];
    for (const [event, payload] of variants) {
      assert.strictEqual(validRegenerationProductPayload(event, payload), true, `Producer event ${event} must be recognized`);
    }
    assert.strictEqual(validRegenerationProductPayload('recorder-overflow', { reason: 'queue-limit' }), true);
    assert.strictEqual(validRegenerationProductPayload('unrecognized-secret-text', undefined), false);
    assert.strictEqual(validRegenerationProductPayload('heartbeat', { message: 'private-secret' }), false);
    assert.strictEqual(validRegenerationProductPayload('consistency-check-skipped', { reason: { toString: 'private' } }), false);
    assert.strictEqual(
      validRegenerationProductPayload('warning-call-entered', { kind: { toString: 'private' }, warningId: 1, checkId: 1 }),
      false
    );
    assert.strictEqual(
      validRegenerationProductPayload('warning-result', {
        kind: 'initialization',
        warningId: 1,
        checkId: 1,
        result: 'private-secret',
        durationMs: 1,
      }),
      false
    );
    const records = [
      { event: 'recorder-armed', payload: undefined, timestamp: armedAt + 1 },
      { event: 'activation-start', payload: undefined, timestamp: armedAt + 2 },
      ...variants.map(([event, payload], index) => ({ event, payload, timestamp: armedAt + 3 + index })),
      { event: 'heartbeat', payload: undefined, timestamp: decisionAt + 1 },
    ].map(({ event, payload, timestamp }, index) => ({
      schemaVersion: 1,
      invocation,
      phase: 'vscode-single',
      armId: probe.receipt!.armId,
      sequence: index + 1,
      timestampUtc: new Date(timestamp).toISOString(),
      event,
      ...(payload ? { payload } : {}),
    }));
    const write = (value: readonly unknown[], trailing = '\n') => {
      fs.writeFileSync(probe.tracePath!, `${value.map((record) => JSON.stringify(record)).join('\n')}${trailing}`);
    };
    write(records);
    let coverage = assessRegenerationProductCoverage(probe, decisionAt);
    assert.strictEqual(coverage.availability, 'available');
    assert.strictEqual(coverage.coverageThroughDecision, true);
    assert.strictEqual(coverage.reason, 'complete');
    assert.strictEqual(coverage.recordCount, records.length);
    assert.strictEqual(coverage.decisionAtUtc, new Date(decisionAt).toISOString());
    const snapshot = fs.readFileSync(probe.tracePath);
    assert.strictEqual(coverage.traceByteLength, snapshot.length);
    assert.strictEqual(coverage.traceSha256, createHash('sha256').update(snapshot).digest('hex'));
    assert.ok(!JSON.stringify(coverage).includes('private-'));

    write(records.slice(0, -1));
    coverage = assessRegenerationProductCoverage(probe, decisionAt);
    assert.strictEqual(coverage.availability, 'unavailable');
    assert.strictEqual(coverage.partial, true);
    assert.strictEqual(coverage.coverageThroughDecision, false);
    assert.ok(coverage.reasonCodes.includes('coverage-through-decision-unproved'));
    const eventCoversDecision = [
      ...records.slice(0, -1),
      {
        ...records.at(-1)!,
        event: 'activation-returned',
        payload: { initialInvocationState: 'pending' },
      },
    ];
    write(eventCoversDecision);
    assert.strictEqual(
      assessRegenerationProductCoverage(probe, decisionAt).availability,
      'available',
      'A contiguous fixed event crossing the boundary can cover it without a heartbeat'
    );
    write(records.map((record, index) => (index === 2 ? { ...record, sequence: 99 } : record)));
    assert.ok(assessRegenerationProductCoverage(probe, decisionAt).reasonCodes.includes('sequence-gap'));
    write(records.map((record, index) => (index === 2 ? { ...record, invocation: randomUUID() } : record)));
    assert.ok(assessRegenerationProductCoverage(probe, decisionAt).reasonCodes.includes('binding-mismatch'));
    write(records.map((record, index) => (index === 2 ? { ...record, payload: { message: 'private-secret' } } : record)));
    assert.ok(assessRegenerationProductCoverage(probe, decisionAt).reasonCodes.includes('invalid-event-or-payload'));
    write([...records.slice(0, -1), { ...records.at(-1)!, event: 'recorder-overflow', payload: { reason: 'event-limit' } }]);
    assert.ok(assessRegenerationProductCoverage(probe, decisionAt).reasonCodes.includes('producer-write-or-overflow'));
    write(records, '');
    assert.ok(assessRegenerationProductCoverage(probe, decisionAt).reasonCodes.includes('incomplete-jsonl'));
    fs.writeFileSync(probe.tracePath, 'x'.repeat(512 * 1024 + 1));
    assert.strictEqual(assessRegenerationProductCoverage(probe, decisionAt).reason, 'trace-overflow');
    write(records);
    fs.writeFileSync(probe.receiptPath, `${receiptBytes} `);
    assert.strictEqual(assessRegenerationProductCoverage(probe, decisionAt).reason, 'arming-receipt-changed');
    fs.writeFileSync(probe.receiptPath, receiptBytes);
    const displaced = `${probe.tracePath}.displaced`;
    fs.renameSync(probe.tracePath, displaced);
    fs.writeFileSync(probe.tracePath, 'replacement');
    assert.strictEqual(assessRegenerationProductCoverage(probe, decisionAt).reason, 'trace-ownership-or-read-failed');
    fs.unlinkSync(probe.tracePath);
    fs.renameSync(displaced, probe.tracePath);
    write(records);
    const final = await finishRegenerationProductCoverage(probe, decisionAt);
    assert.strictEqual(final.availability, 'available');
    const saved = JSON.parse(fs.readFileSync(path.join(root, 'vscode-single-product-collection.json'), 'utf8'));
    assert.strictEqual(saved.coverageThroughDecision, true);
    assert.strictEqual(saved.reason, 'complete');
    assert.ok(!JSON.stringify(saved).includes('private-'));

    fs.writeFileSync(path.join(root, 'baseline-product-events.jsonl'), 'stale');
    const stale = armRegenerationProbe({
      root,
      phase: 'baseline',
      invocation,
      identity,
      env: { LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true' },
    });
    assert.strictEqual(stale.reason, 'arming-failed');
    assert.strictEqual(stale.childEnv.LA_E2E_CLI_REGENERATION_PROBE, undefined);
    assert.strictEqual(fs.readFileSync(path.join(root, 'baseline-product-events.jsonl'), 'utf8'), 'stale');
    const noSpawn = assessRegenerationProductCoverage(stale, Date.now());
    assert.strictEqual(noSpawn.availability, 'unavailable');
    assert.strictEqual(noSpawn.reason, 'arming-failed');

    const delayed = armRegenerationProbe({
      root,
      phase: 'root-repeat',
      invocation,
      identity,
      env: { LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true' },
    });
    assert.ok(delayed.receipt && delayed.tracePath);
    const delayedArmed = Date.parse(delayed.receipt.armedAtUtc);
    delayed.spawnRequestedAt = delayedArmed;
    delayed.spawnObservedAt = delayedArmed + 1;
    const delayedDecision = delayedArmed + 100;
    const delayedRecords = [
      { event: 'recorder-armed', timestamp: delayedArmed + 1 },
      { event: 'activation-start', timestamp: delayedArmed + 2 },
      { event: 'heartbeat', timestamp: delayedDecision + 1 },
    ].map(({ event, timestamp }, index) => ({
      schemaVersion: 1,
      invocation,
      phase: 'root-repeat',
      armId: delayed.receipt!.armId,
      sequence: index + 1,
      timestampUtc: new Date(timestamp).toISOString(),
      event,
    }));
    setImmediate(() => fs.writeFileSync(delayed.tracePath!, `${delayedRecords.map((record) => JSON.stringify(record)).join('\n')}\n`));
    const delayedCoverage = await finishRegenerationProductCoverage(delayed, delayedDecision);
    assert.strictEqual(delayedCoverage.availability, 'available', 'Bounded collection waits for an asynchronously armed writer');

    const eventOnly = armRegenerationProbe({
      root,
      phase: 'vscode-multiple',
      invocation,
      identity,
      env: { LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true' },
    });
    assert.ok(eventOnly.receipt && eventOnly.tracePath);
    const eventOnlyArmed = Date.parse(eventOnly.receipt.armedAtUtc);
    eventOnly.spawnRequestedAt = eventOnlyArmed;
    eventOnly.spawnObservedAt = eventOnlyArmed + 1;
    const eventOnlyDecision = eventOnlyArmed + 100;
    const eventOnlyRecords = [
      { event: 'recorder-armed', timestamp: eventOnlyArmed + 1, payload: undefined },
      { event: 'activation-start', timestamp: eventOnlyArmed + 2, payload: undefined },
      {
        event: 'activation-returned',
        timestamp: eventOnlyDecision + 1,
        payload: { initialInvocationState: 'not-scheduled' },
      },
    ].map(({ event, timestamp, payload }, index) => ({
      schemaVersion: 1,
      invocation,
      phase: 'vscode-multiple',
      armId: eventOnly.receipt!.armId,
      sequence: index + 1,
      timestampUtc: new Date(timestamp).toISOString(),
      event,
      ...(payload ? { payload } : {}),
    }));
    fs.writeFileSync(eventOnly.tracePath, `${eventOnlyRecords.map((record) => JSON.stringify(record)).join('\n')}\n`);
    const eventOnlyCoverage = await finishRegenerationProductCoverage(eventOnly, eventOnlyDecision);
    assert.strictEqual(eventOnlyCoverage.availability, 'available', 'A contiguous fixed event may cover the decision');

    const invalid = armRegenerationProbe({
      root,
      phase: '../unsafe',
      invocation,
      identity,
      env: { LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true' },
    });
    assert.strictEqual(invalid.reason, 'invalid-host-binding');
    assert.strictEqual(invalid.childEnv.LA_E2E_CLI_REGENERATION_PROBE, undefined);

    await testUnprovedPhysicalIdentity(root, invocation, identity);
    await testPhysicalWorkspaceSamples(root);
    await testSafeDetectorAndInput(root, invocation, identity);
    console.log('[workspaceArtifactRegenerationDiagnostics.unit] modeled observation controls passed');
    testNativePublisherContract(root, invocation, identity);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function runRegenerationObservationControls(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regeneration-observation-controls-'));
  try {
    const invocation = randomUUID();
    const identity = { source: 'unit', run: 'unit', job: 'unit', platform: process.platform };
    await testUnprovedPhysicalIdentity(root, invocation, identity);
    await testSafeDetectorAndInput(root, invocation, identity);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// These pre-existing tests exercise the sanitizer and coverage machinery as a
// label-only model. They do not prove physical ownership in a native host.
function enableLegacyLabelOnlyObservationModelForUnit(observation: RegenerationObservation): void {
  observation.setSamplerForTests(async (cdp, expectation) => {
    const before = await readRegularWorkbenchOwnership(cdp, expectation);
    const raw = await cdp.evaluate<RawWorkbenchState>(undefined, regenerationDiagnosticDomScript);
    const owner = await readRegularWorkbenchOwnership(cdp, expectation);
    return { before, raw, owner };
  });
}

function armBoundUnitProbe(root: string, phase: string, invocation: string, identity: Record<string, string>): RegenerationProbe {
  const probe = armRegenerationProbe({ root, phase, invocation, identity, env: { LA_E2E_CLI_DIAGNOSTIC_ONLY: 'true' } });
  assert.ok(probe.receipt && probe.tracePath);
  probe.spawnRequestedAt = Date.parse(probe.receipt.armedAtUtc);
  probe.spawnObservedAt = probe.spawnRequestedAt;
  return probe;
}

async function finishBoundUnitProbe(probe: RegenerationProbe, decisionAt: number): Promise<void> {
  assert.ok(probe.receipt && probe.tracePath);
  const armedAt = Date.parse(probe.receipt.armedAtUtc);
  assert.ok(decisionAt >= armedAt);
  const records = [
    { event: 'recorder-armed', timestamp: armedAt },
    { event: 'activation-start', timestamp: armedAt },
    { event: 'heartbeat', timestamp: decisionAt },
  ].map(({ event, timestamp }, index) => ({
    schemaVersion: 1,
    invocation: probe.invocation,
    phase: probe.phase,
    armId: probe.receipt!.armId,
    sequence: index + 1,
    timestampUtc: new Date(timestamp).toISOString(),
    event,
  }));
  fs.writeFileSync(probe.tracePath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  const result = await finishRegenerationProductCoverage(probe, decisionAt);
  assert.strictEqual(result.availability, 'available');
}

async function testUnprovedPhysicalIdentity(root: string, invocation: string, identity: Record<string, string>): Promise<void> {
  const controlRoot = path.join(root, 'physical-identity-control');
  const expectedParent = path.join(root, 'expected');
  const foreignParent = path.join(root, 'foreign');
  const expectedWorkspace = path.join(expectedParent, 'same.code-workspace');
  const foreignWorkspace = path.join(foreignParent, 'same.code-workspace');
  const expectedRoot = path.join(expectedParent, 'same-root');
  const foreignRoot = path.join(foreignParent, 'same-root');
  fs.mkdirSync(controlRoot);
  fs.mkdirSync(expectedRoot, { recursive: true });
  fs.mkdirSync(foreignRoot, { recursive: true });
  fs.writeFileSync(expectedWorkspace, '{}');
  fs.writeFileSync(foreignWorkspace, '{}');
  assert.notStrictEqual(fs.realpathSync(expectedWorkspace), fs.realpathSync(foreignWorkspace));
  assert.notStrictEqual(fs.realpathSync(expectedRoot), fs.realpathSync(foreignRoot));
  const probe = armBoundUnitProbe(controlRoot, 'baseline', invocation, identity);

  let listener: ((event: CdpConsoleDiagnostic) => void) | undefined;
  let reads = 0;
  let generation = 1;
  const fake = {
    get contextGeneration() {
      return generation;
    },
    onConsoleDiagnostic: (callback: (event: CdpConsoleDiagnostic) => void) => {
      listener = callback;
      return () => {
        listener = undefined;
      };
    },
    send: async () => ({ result: {} }),
    evaluate: async () => {
      reads++;
      // The exact same shell labels are consistent with both physical paths.
      return { timeOrigin: 42, title: 'same (workspace) - Visual Studio Code', ready: true, roots: ['same-root'] };
    },
  } as unknown as CdpConnection;
  const observation = new RegenerationObservation(
    controlRoot,
    'baseline',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: expectedWorkspace, rootPaths: [expectedRoot] },
    expectedRoot
  );
  observation.boundary('phase-start');
  observation.onConnection(fake);
  observation.start(fake, 42);
  const controlled = observation as unknown as { timer?: NodeJS.Timeout; sample: (deadline: number) => Promise<void> };
  clearTimeout(controlled.timer);
  await controlled.sample(Date.now() + 1000);
  listener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  generation++;
  await controlled.sample(Date.now() + 1000);
  listener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  const decisionAt = Date.now();
  observation.boundary('decision');
  assert.strictEqual(await observation.stopAndSample(), undefined, 'Labels alone must not produce an owned detector state');
  await observation.finish(decisionAt);
  await finishBoundUnitProbe(probe, decisionAt);

  const timeline = fs.readFileSync(path.join(controlRoot, 'baseline-detector-timeline.jsonl'), 'utf8');
  const summaryText = fs.readFileSync(path.join(controlRoot, 'baseline-diagnostic-summary.json'), 'utf8');
  const summary = JSON.parse(summaryText);
  const events = timeline
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.strictEqual(reads, 0, 'No label-only CDP read can prove the physical workspace');
  assert.ok(events.some((event) => event.reason === 'workspace-root-unproved'));
  assert.ok(!events.some((event) => event.event === 'attach-owned' || event.event === 'renderer-console' || event.outcome === 'observed'));
  assert.strictEqual(summary.detector.availability, 'unavailable');
  assert.strictEqual(summary.detector.decisionCovered, false);
  assert.strictEqual(summary.detector.sampleCount, 0);
  assert.strictEqual(summary.console.availability, 'unavailable');
  assert.strictEqual(summary.console.eventCount, 0);
  assert.strictEqual(summary.console.preOwnedDiscardedCount, 2);
  assert.strictEqual(summary.notification, null);
  assert.ok(!timeline.includes(expectedParent) && !timeline.includes(foreignParent));
  assert.ok(!summaryText.includes(expectedParent) && !summaryText.includes(foreignParent));

  const { collectDetectorDiagnostics } = require('../../../scripts/regeneration-diagnostic-publication') as {
    collectDetectorDiagnostics: (
      rootPath: string,
      phases: string[],
      family: string,
      enabled: boolean,
      expectedIdentity: Record<string, string>
    ) => Array<{
      type: string;
      availability?: string;
      summary?: { detector: { availability: string; decisionCovered: boolean }; console: { availability: string } };
    }>;
  };
  const published = collectDetectorDiagnostics(controlRoot, ['baseline'], invocation, true, identity);
  const capture = published.find((event) => event.type === 'detector-capture');
  assert.notStrictEqual(capture?.availability, 'available');
  assert.strictEqual(capture?.summary?.detector.availability, 'unavailable');
  assert.strictEqual(capture?.summary?.detector.decisionCovered, false);
  assert.strictEqual(capture?.summary?.console.availability, 'unavailable');
  assert.ok(!JSON.stringify(published).includes(expectedParent) && !JSON.stringify(published).includes(foreignParent));
}

async function testPhysicalWorkspaceSamples(root: string): Promise<void> {
  const expectedParent = path.join(root, 'sample-expected');
  const foreignParent = path.join(root, 'sample-foreign');
  const expectedRoot = path.join(expectedParent, 'same-root');
  const foreignRoot = path.join(foreignParent, 'same-root');
  const expectedWorkspace = path.join(expectedParent, 'same.code-workspace');
  const foreignWorkspace = path.join(foreignParent, 'same.code-workspace');
  fs.mkdirSync(expectedRoot, { recursive: true });
  fs.mkdirSync(foreignRoot, { recursive: true });
  fs.writeFileSync(expectedWorkspace, '{}');
  fs.writeFileSync(foreignWorkspace, '{}');
  const expectation = { workspaceFilePath: expectedWorkspace, rootPaths: [expectedRoot] };
  const pinned = await pinPhysicalWorkspacePaths(expectation);
  const physical: LivePhysicalWorkspace = {
    timeOrigin: 42,
    workspaceFilePath: expectedWorkspace,
    rootPaths: [expectedRoot],
    uiRootPaths: [expectedRoot],
  };
  const raw: RawWorkbenchState = {
    timeOrigin: 42,
    sampledAtMs: Date.now(),
    documentVisible: true,
    documentFocused: true,
    centerMounted: false,
    centerVisible: false,
    toastCount: 0,
    retainedCount: 0,
    dnd: 'unknown',
    truncated: false,
    candidates: [],
  };
  let actual = physical;
  let generation = 1;
  let targetId = 'owned-target';
  let alterGeneration = false;
  let alterTarget = false;
  const fake: CdpEvaluator = {
    get targetId() {
      return targetId;
    },
    get contextGeneration() {
      return generation;
    },
    send: async () => ({}),
    evaluate: async <T>(_context: number | undefined, expression: string) => {
      assert.strictEqual(expression, regenerationDiagnosticSampleExpression);
      if (alterGeneration) {
        generation++;
      }
      if (alterTarget) {
        targetId = 'foreign-target';
      }
      return {
        physical: actual,
        raw: { ...raw, sampledAtMs: Date.now() },
        owner: { timeOrigin: 42, title: 'same (workspace) - Visual Studio Code', ready: true, roots: ['same-root'] },
      } as T;
    },
  };
  const sample = () => samplePhysicalRegenerationWorkbench(fake, expectation, Date.now() + 2000, pinned);
  assert.strictEqual((await sample()).owner.owned, true);
  if (process.platform === 'win32') {
    actual = {
      ...physical,
      workspaceFilePath: expectedWorkspace.toLowerCase(),
      rootPaths: [expectedRoot.toLowerCase()],
      uiRootPaths: [expectedRoot.toLowerCase()],
    };
    assert.strictEqual((await sample()).owner.owned, true, 'Windows path spelling must resolve to the actual physical casing');
  }
  for (const foreign of [
    { ...physical, workspaceFilePath: foreignWorkspace },
    { ...physical, rootPaths: [foreignRoot] },
    { ...physical, uiRootPaths: [foreignRoot] },
    { ...physical, uiRootPaths: [] },
    { ...physical, timeOrigin: 43 },
  ]) {
    actual = foreign;
    await assert.rejects(sample(), 'Same-name foreign or transitioning workspaces must fail closed');
  }
  actual = physical;
  alterGeneration = true;
  await assert.rejects(sample(), 'A changed renderer context must fail closed');
  alterGeneration = false;
  alterTarget = true;
  await assert.rejects(sample(), 'A changed CDP target must fail closed');
  alterTarget = false;
  targetId = 'owned-target';
  const displaced = `${expectedWorkspace}.displaced`;
  fs.renameSync(expectedWorkspace, displaced);
  fs.writeFileSync(expectedWorkspace, '{}');
  try {
    await assert.rejects(sample(), 'A workspace file substituted after pinning must fail closed');
  } finally {
    fs.unlinkSync(expectedWorkspace);
    fs.renameSync(displaced, expectedWorkspace);
  }
  await assert.rejects(
    samplePhysicalRegenerationWorkbench(fake, expectation, Date.now() + 2000),
    'Samples without a setup-time physical identity are unavailable'
  );
}

async function testSafeDetectorAndInput(root: string, invocation: string, identity: Record<string, string>): Promise<void> {
  const appDir = path.join(root, 'private-app-path');
  const prompt = (project: string) =>
    `Detected an Azure Logic App project "${project}" that may be missing files. Initialize for optimal use with VS Code? private-message`;
  const candidate = {
    kind: 'notification' as const,
    retained: false,
    text: prompt(appDir),
    displayed: true,
    inViewport: true,
    inactive: false,
    yesCount: 1,
    visibleYesCount: 1,
    disabledYesCount: 1,
    ariaDisabledYesCount: 1,
    obstructedYesCount: 1,
  };
  const raw = {
    timeOrigin: 42,
    sampledAtMs: Date.now(),
    documentVisible: true,
    documentFocused: true,
    centerMounted: true,
    centerVisible: false,
    toastCount: 1,
    retainedCount: 0,
    dnd: 'unknown' as const,
    truncated: false,
    candidates: [
      candidate,
      { ...candidate, disabledYesCount: 0, ariaDisabledYesCount: 0, obstructedYesCount: 0 },
      {
        ...candidate,
        text: prompt(path.join(root, 'private-other')),
        displayed: false,
        inViewport: false,
        yesCount: 0,
        visibleYesCount: 0,
      },
    ],
  };
  const safe = sanitizeRegenerationDiagnosticState(raw, true, 42, appDir);
  assert.ok(safe.candidates[0].reasonCodes.includes('disabled-yes'));
  assert.ok(safe.candidates[0].reasonCodes.includes('aria-disabled-yes'));
  assert.ok(safe.candidates[0].reasonCodes.includes('obstructed-yes'));
  assert.ok(safe.candidates[0].reasonCodes.includes('duplicate-candidate'));
  assert.ok(safe.candidates[2].reasonCodes.includes('wrong-project'));
  assert.ok(safe.candidates[2].reasonCodes.includes('hidden'));
  assert.ok(!JSON.stringify(safe).includes('private-'));
  assert.ok(!JSON.stringify(safe).includes(root));
  const otherCandidates = Array.from({ length: 20 }, () => ({ ...candidate, text: '' }));
  const withOtherCandidates = sanitizeRegenerationDiagnosticState(
    { ...raw, candidates: [...otherCandidates, candidate] },
    true,
    42,
    appDir
  );
  assert.strictEqual(withOtherCandidates.truncated, false, 'Unrelated candidates do not consume the relevant-candidate limit');
  assert.strictEqual(withOtherCandidates.candidates.length, 1);
  const tooManyRelevant = sanitizeRegenerationDiagnosticState(
    { ...raw, candidates: Array.from({ length: 17 }, () => candidate) },
    true,
    42,
    appDir
  );
  assert.strictEqual(tooManyRelevant.truncated, true, 'Dropped relevant candidates must still invalidate coverage');
  assert.strictEqual(tooManyRelevant.candidates.length, 16);
  assert.strictEqual(sanitizeRegenerationDiagnosticState({ ...raw, truncated: true }, true, 42, appDir).truncated, true);

  const { JSDOM } = require('jsdom') as {
    JSDOM: new (html: string, options: Record<string, unknown>) => { window: { eval: (script: string) => unknown; close: () => void } };
  };
  const domState = (body: string): Parameters<typeof sanitizeRegenerationDiagnosticState>[0] => {
    const dom = new JSDOM(`<html><body>${body}</body></html>`, { runScripts: 'outside-only' });
    try {
      dom.window.eval(
        'HTMLElement.prototype.getBoundingClientRect = () => ({left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10})'
      );
      dom.window.eval('document.elementFromPoint = () => document.body');
      return dom.window.eval(regenerationDiagnosticDomScript) as Parameters<typeof sanitizeRegenerationDiagnosticState>[0];
    } finally {
      dom.window.close();
    }
  };
  const options = '<button>No</button>'.repeat(129);
  assert.strictEqual(
    domState(`<div role="dialog">${'unrelated'.repeat(1000)}${options}</div>`).truncated,
    false,
    'Large unrelated dialogs must not invalidate prompt sampling'
  );
  assert.strictEqual(
    domState(`<div role="dialog">${'x'.repeat(8193)}${prompt(appDir)}</div>`).truncated,
    true,
    'Truncated text containing a relevant prompt must remain unverified'
  );
  assert.strictEqual(
    domState(`<div role="dialog">${prompt(appDir)}${options}</div>`).truncated,
    true,
    'Truncated options on a relevant prompt must remain unverified'
  );
  assert.strictEqual(
    domState(`<div role="dialog">${prompt(appDir)}${'<button>Yes</button>'.repeat(65)}</div>`).truncated,
    true,
    'Capped Yes-option counts on a relevant prompt must remain unverified'
  );
  assert.strictEqual(
    domState('<div role="dialog"></div>'.repeat(129)).truncated,
    true,
    'A truncated container search must remain unverified'
  );
  const bellOnly = domState('<button aria-label="Notifications">Notifications</button>');
  assert.strictEqual(bellOnly.centerMounted, false, 'The notification bell is not the notification center');
  assert.strictEqual(bellOnly.centerVisible, false);
  const affordanceDom = new JSDOM(
    '<html><body><div class="statusbar"><div class="statusbar-item" id="status.notifications" aria-label="Notifications"></div></div></body></html>',
    { runScripts: 'outside-only' }
  );
  try {
    affordanceDom.window.eval(
      'HTMLElement.prototype.getBoundingClientRect = () => ({left: 1, top: 2, right: 11, bottom: 12, width: 10, height: 10})'
    );
    affordanceDom.window.eval('document.elementFromPoint = () => document.getElementById("status.notifications")');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(affordanceDom.window.eval(notificationCenterAffordanceScript))), {
      centerVisible: false,
      candidateCount: 1,
      truncated: false,
      point: { x: 6, y: 7 },
    });
  } finally {
    affordanceDom.window.close();
  }
  const center = domState('<div class="notifications-center"></div>');
  assert.strictEqual(center.centerMounted, true);
  assert.strictEqual(center.centerVisible, true);
  const retainedYes = `
    <div class="notifications-center"><div class="notifications-list-container"><div class="monaco-list" role="list">
      <div class="monaco-list-row" role="dialog"><div class="notification-list-item">${prompt(appDir)}<button>Yes</button></div></div>
      <div class="monaco-list-row" role="dialog"><div class="notification-list-item">Another notification</div></div>
    </div></div></div>`;
  const retainedState = sanitizeRegenerationDiagnosticState(domState(retainedYes), true, undefined, appDir);
  assert.strictEqual(domState(retainedYes).candidates[0]?.retained, true);
  assert.strictEqual(retainedState.centerVisible, true);
  assert.strictEqual(retainedState.retainedCount, 2);
  assert.strictEqual(retainedState.blockingUiVisible, false, 'The notification list ARIA role is not a blocking modal');
  assert.strictEqual(retainedState.candidates[0]?.kind, 'notification');
  assert.strictEqual(retainedState.candidates[0]?.yesCount, 1);
  assert.ok(retainedState.candidates[0]?.reasonCodes.includes('obstructed-yes'));
  const withModal = sanitizeRegenerationDiagnosticState(
    domState(`${retainedYes}<div role="dialog">Blocking modal</div>`),
    true,
    undefined,
    appDir
  );
  assert.strictEqual(withModal.blockingUiVisible, true, 'A separate genuine dialog still blocks diagnostic reveal');
  const nestedModal = sanitizeRegenerationDiagnosticState(
    domState(
      `<div class="notifications-center"><div class="notifications-list-container"><div class="monaco-list" role="list">
        <div class="monaco-list-row" role="dialog">
          <div class="notification-list-item">Notification<div class="monaco-dialog-box" role="dialog">Blocking modal</div></div>
        </div>
      </div></div></div>`
    ),
    true,
    undefined,
    appDir
  );
  assert.strictEqual(nestedModal.blockingUiVisible, true, 'A real dialog nested inside a notification remains blocking');
  const scrollDom = new JSDOM(
    '<html><body><div class="notifications-center"><div class="notifications-list-container"><div class="monaco-scrollable-element"></div></div></div></body></html>',
    { runScripts: 'outside-only' }
  );
  try {
    scrollDom.window.eval(
      'HTMLElement.prototype.getBoundingClientRect = () => ({left: 10, top: 20, right: 110, bottom: 120, width: 100, height: 100})'
    );
    scrollDom.window.eval(`
      const scroller = document.querySelector('.monaco-scrollable-element');
      Object.defineProperties(scroller, {
        scrollHeight: { value: 500 },
        clientHeight: { value: 100 },
        scrollTop: { value: 0, writable: true },
      });
      document.elementFromPoint = () => scroller;
    `);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(scrollDom.window.eval(notificationCenterScrollStateScript))), {
      centerCount: 1,
      scrollableCount: 1,
      atStart: true,
      atEnd: false,
      point: { x: 60, y: 70 },
      deltaY: 100,
    });
  } finally {
    scrollDom.window.close();
  }
  const summary = summarizeRegenerationPromptObservation(
    { ready: true, timeOrigin: 42, containers: [{ kind: 'notification', text: candidate.text, buttons: [{ text: 'Yes' }], rows: [] }] },
    appDir,
    1
  );
  assert.strictEqual(summary.candidates[0].category, 'initialization');
  assert.ok(!JSON.stringify(summary).includes('private-'));
  const nativeObservation = {
    ready: true,
    timeOrigin: 42,
    containers: [{ kind: 'notification' as const, text: candidate.text, buttons: [{ text: 'Yes', point: { x: 2, y: 3 } }], rows: [] }],
  };
  const canonical = regenerationPromptObservationForLog(nativeObservation, appDir, ['.vscode/tasks.json'], false);
  assert.deepStrictEqual(canonical, {
    ready: true,
    timeOrigin: 42,
    missingTargets: ['.vscode/tasks.json'],
    containers: [{ kind: 'notification', text: candidate.text, buttons: [{ text: 'Yes', hitTestable: true, point: { x: 2, y: 3 } }] }],
  });
  assert.ok(
    !JSON.stringify(regenerationPromptObservationForLog(nativeObservation, appDir, ['.vscode/tasks.json'], true)).includes('private-')
  );
  const input = new RegenerationInputTracker();
  await input.send('Runtime.evaluate', async () => true);
  assert.strictEqual(input.uncertain, false);
  await assert.rejects(
    input.send('Input.dispatchMouseEvent', async () => {
      throw new Error('private-input-error');
    })
  );
  assert.strictEqual(input.uncertain, true, 'An uncertain native input is never safe to replay');

  const inspectionRaw = (centerVisible: boolean, retainedTarget: boolean): RawWorkbenchState => ({
    timeOrigin: 42,
    sampledAtMs: Date.now(),
    documentVisible: true,
    documentFocused: true,
    centerMounted: centerVisible,
    centerVisible,
    toastCount: 0,
    retainedCount: retainedTarget ? 1 : 0,
    dnd: 'unknown',
    truncated: false,
    candidates: retainedTarget
      ? [
          {
            ...candidate,
            retained: true,
            semanticIdentity: 'data-index:0',
            text: prompt(appDir),
            disabledYesCount: 0,
            ariaDisabledYesCount: 0,
            obstructedYesCount: 0,
            yesPoint: { x: 8, y: 9 },
          },
        ]
      : [],
  });
  const owner = {
    timeOrigin: 42,
    title: 'unit (workspace) - Visual Studio Code',
    ready: true,
    roots: ['private-app-path'],
    shellOwned: true,
    owned: true,
  };
  const sent: string[] = [];
  const inspectionCdp = {
    targetId: 'owned-target',
    contextGeneration: 1,
    evaluate: async (_contextId: number | undefined, expression: string) => {
      if (expression === notificationCenterAffordanceScript) {
        return { centerVisible: false, candidateCount: 1, truncated: false, point: { x: 4, y: 5 } };
      }
      if (expression === notificationCenterScrollStateScript) {
        return { centerCount: 1, scrollableCount: 1, atStart: true, atEnd: false, point: { x: 6, y: 7 }, deltaY: 200 };
      }
      throw new Error('unexpected diagnostic expression');
    },
    send: async (method: string) => {
      sent.push(method);
      return {};
    },
  } as unknown as CdpConnection;
  const inspection = await inspectRegenerationNotificationCenter({
    cdp: inspectionCdp,
    input: new RegenerationInputTracker(),
    expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir,
    deadline: Date.now() + 5000,
    expectedTargetId: 'owned-target',
    expectedTimeOrigin: 42,
    expectedContextGeneration: 1,
    admittedDocument: { targetId: 'owned-target', invalidated: false, dispose: () => undefined },
    sampler: async () => ({
      before: owner,
      owner,
      raw: inspectionRaw(sent.length >= 3, sent.length >= 4),
    }),
  });
  assert.deepStrictEqual(inspection, {
    availability: 'available',
    target: 'retained',
    reason: 'inspected',
    retainedCount: 1,
    targetInitializationCount: 1,
    otherProjectCount: 0,
    sampleCount: 11,
    scrollCount: 1,
    truncated: false,
    bottomVerified: false,
    openedByDiagnostic: true,
  });
  assert.strictEqual(isValidNotificationCenterInspection(inspection), true);
  assert.strictEqual(
    isValidNotificationCenterInspection({ ...inspection, sampleCount: 0 }),
    false,
    'Available inspection requires at least one fenced sample'
  );
  assert.strictEqual(
    isValidNotificationCenterInspection({ ...inspection, targetInitializationCount: 0 }),
    false,
    'Retained requires a positive target count'
  );
  assert.strictEqual(
    isValidNotificationCenterInspection({
      ...inspection,
      target: 'absent',
      retainedCount: 0,
      targetInitializationCount: 0,
      otherProjectCount: 0,
      bottomVerified: false,
    }),
    false,
    'Absent requires verified bottom coverage'
  );
  assert.strictEqual(
    isValidNotificationCenterInspection({
      ...inspection,
      target: 'absent',
      retainedCount: 0,
      targetInitializationCount: 0,
      otherProjectCount: 0,
      truncated: false,
      bottomVerified: true,
    }),
    true
  );
  assert.strictEqual(
    isValidNotificationCenterInspection({
      ...inspection,
      target: 'unknown',
      targetInitializationCount: 0,
      truncated: true,
      bottomVerified: false,
    }),
    true
  );
  assert.strictEqual(
    isValidNotificationCenterInspection({
      ...inspection,
      availability: 'unavailable',
      target: 'unknown',
      reason: 'identity-unavailable',
      targetInitializationCount: 0,
      bottomVerified: true,
    }),
    false
  );
  assert.strictEqual(
    isValidNotificationCenterInspection({ ...inspection, otherProjectCount: inspection.retainedCount + 1 }),
    false,
    'Categorized counts cannot exceed retained notifications'
  );
  assert.strictEqual(
    isValidNotificationCenterInspection({
      ...inspection,
      retainedCount: 65,
      targetInitializationCount: 1,
      otherProjectCount: 64,
    }),
    false,
    'Notification counts remain bounded'
  );
  assert.deepStrictEqual(
    sent,
    ['Input.dispatchMouseEvent', 'Input.dispatchMouseEvent', 'Input.dispatchMouseEvent', 'Input.dispatchMouseEvent'],
    'The diagnostic performs one hit-tested click and one wheel event without command dispatch'
  );
  const ambiguousSent: string[] = [];
  const ambiguous = await inspectRegenerationNotificationCenter({
    cdp: {
      ...inspectionCdp,
      evaluate: async (_contextId: number | undefined, expression: string) => {
        if (expression === notificationCenterAffordanceScript) {
          return { centerVisible: false, candidateCount: 2, truncated: false, point: null };
        }
        throw new Error('unexpected diagnostic expression');
      },
      send: async (method: string) => {
        ambiguousSent.push(method);
        return {};
      },
    } as unknown as CdpConnection,
    input: new RegenerationInputTracker(),
    expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir,
    deadline: Date.now() + 5000,
    expectedTargetId: 'owned-target',
    expectedTimeOrigin: 42,
    expectedContextGeneration: 1,
    admittedDocument: { targetId: 'owned-target', invalidated: false, dispose: () => undefined },
    sampler: async () => ({ before: owner, owner, raw: inspectionRaw(false, false) }),
  });
  assert.strictEqual(ambiguous.availability, 'unavailable');
  assert.strictEqual(ambiguous.reason, 'affordance-ambiguous');
  assert.deepStrictEqual(ambiguousSent, [], 'Ambiguous affordances must not receive input');
  const changedDocumentSent: string[] = [];
  const changedDocumentInspection = await inspectRegenerationNotificationCenter({
    cdp: {
      ...inspectionCdp,
      send: async (method: string) => {
        changedDocumentSent.push(method);
        return {};
      },
    } as unknown as CdpConnection,
    input: new RegenerationInputTracker(),
    expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir,
    deadline: Date.now() + 5000,
    expectedTargetId: 'owned-target',
    expectedTimeOrigin: 42,
    expectedContextGeneration: 1,
    admittedDocument: { targetId: 'owned-target', invalidated: true, dispose: () => undefined },
    sampler: async () => ({ before: owner, owner, raw: inspectionRaw(false, false) }),
  });
  assert.strictEqual(changedDocumentInspection.availability, 'unavailable');
  assert.strictEqual(changedDocumentInspection.reason, 'identity-unavailable');
  assert.deepStrictEqual(changedDocumentSent, [], 'Changed document identity must fail before input');
  const invalidatedAfterHitTest = { targetId: 'owned-target', invalidated: false, dispose: () => undefined };
  const afterHitTestSent: string[] = [];
  const afterHitTest = await inspectRegenerationNotificationCenter({
    cdp: {
      ...inspectionCdp,
      evaluate: async (_contextId: number | undefined, expression: string) => {
        if (expression === notificationCenterAffordanceScript) {
          invalidatedAfterHitTest.invalidated = true;
          return { centerVisible: false, candidateCount: 1, truncated: false, point: { x: 4, y: 5 } };
        }
        throw new Error('unexpected diagnostic expression');
      },
      send: async (method: string) => {
        afterHitTestSent.push(method);
        return {};
      },
    } as unknown as CdpConnection,
    input: new RegenerationInputTracker(),
    expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir,
    deadline: Date.now() + 5000,
    expectedTargetId: 'owned-target',
    expectedTimeOrigin: 42,
    expectedContextGeneration: 1,
    admittedDocument: invalidatedAfterHitTest,
    sampler: async () => ({ before: owner, owner, raw: inspectionRaw(false, false) }),
  });
  assert.strictEqual(afterHitTest.reason, 'identity-unavailable');
  assert.deepStrictEqual(afterHitTestSent, [], 'Identity invalidation after hit-test must prevent the first native input event');
  const invalidatedBetweenEvents = { targetId: 'owned-target', invalidated: false, dispose: () => undefined };
  const betweenEventsSent: string[] = [];
  const betweenEventsInput = new RegenerationInputTracker();
  let clickDispatchCount = 0;
  const betweenEvents = await inspectRegenerationNotificationCenter({
    cdp: {
      ...inspectionCdp,
      send: async (method: string) => {
        betweenEventsSent.push(method);
        clickDispatchCount++;
        if (clickDispatchCount === 2) {
          invalidatedBetweenEvents.invalidated = true;
        }
        return {};
      },
    } as unknown as CdpConnection,
    input: betweenEventsInput,
    expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir,
    deadline: Date.now() + 5000,
    expectedTargetId: 'owned-target',
    expectedTimeOrigin: 42,
    expectedContextGeneration: 1,
    admittedDocument: invalidatedBetweenEvents,
    sampler: async () => ({ before: owner, owner, raw: inspectionRaw(false, false) }),
  });
  assert.strictEqual(betweenEvents.reason, 'uncertain-input');
  assert.strictEqual(betweenEvents.openedByDiagnostic, false);
  assert.deepStrictEqual(
    betweenEventsSent,
    ['Input.dispatchMouseEvent', 'Input.dispatchMouseEvent'],
    'Identity invalidation after mousePressed must prevent mouseReleased'
  );
  assert.strictEqual(betweenEventsInput.uncertain, true);
  assert.strictEqual(betweenEventsInput.pendingInvalid, true);
  await assert.rejects(
    betweenEventsInput.send('Input.dispatchMouseEvent', async () => {
      betweenEventsSent.push('unexpected-later-input');
      return {};
    })
  );
  assert.deepStrictEqual(
    betweenEventsSent,
    ['Input.dispatchMouseEvent', 'Input.dispatchMouseEvent'],
    'Pending-invalid click state must prevent all later diagnostic input'
  );
  const invalidatedBeforeWheel = { targetId: 'owned-target', invalidated: false, dispose: () => undefined };
  const wheelSent: string[] = [];
  let scrollHitTests = 0;
  const wheelRace = await inspectRegenerationNotificationCenter({
    cdp: {
      ...inspectionCdp,
      evaluate: async (_contextId: number | undefined, expression: string) => {
        if (expression === notificationCenterScrollStateScript) {
          scrollHitTests++;
          if (scrollHitTests === 2) {
            invalidatedBeforeWheel.invalidated = true;
          }
          return { centerCount: 1, scrollableCount: 1, atStart: true, atEnd: false, point: { x: 6, y: 7 }, deltaY: 200 };
        }
        throw new Error('unexpected diagnostic expression');
      },
      send: async (method: string) => {
        wheelSent.push(method);
        return {};
      },
    } as unknown as CdpConnection,
    input: new RegenerationInputTracker(),
    expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir,
    deadline: Date.now() + 5000,
    expectedTargetId: 'owned-target',
    expectedTimeOrigin: 42,
    expectedContextGeneration: 1,
    admittedDocument: invalidatedBeforeWheel,
    sampler: async () => ({ before: owner, owner, raw: inspectionRaw(true, false) }),
  });
  assert.strictEqual(wheelRace.reason, 'identity-unavailable');
  assert.deepStrictEqual(wheelSent, [], 'Identity invalidation after wheel hit-test must prevent wheel input');

  const activationRaw = (centerVisible: boolean, variant: 'target' | 'absent' | 'wrong-project' | 'ambiguous'): RawWorkbenchState => {
    const target = {
      ...candidate,
      retained: true,
      semanticIdentity: 'data-index:0',
      text: prompt(appDir),
      disabledYesCount: 0,
      ariaDisabledYesCount: 0,
      obstructedYesCount: 0,
      yesPoint: { x: 8, y: 9 },
    };
    const candidates =
      !centerVisible || variant === 'absent'
        ? []
        : variant === 'wrong-project'
          ? [{ ...target, text: prompt(path.join(root, 'private-other')) }]
          : variant === 'ambiguous'
            ? [target, { ...target }]
            : [target];
    return {
      ...inspectionRaw(centerVisible, false),
      centerMounted: centerVisible,
      centerVisible,
      retainedCount: candidates.length,
      candidates,
    };
  };
  const activationCdp = (sentEvents: Array<{ method: string; params?: Record<string, unknown> }>, onSend?: () => void) =>
    ({
      targetId: 'owned-target',
      contextGeneration: 1,
      evaluate: async (_contextId: number | undefined, expression: string) => {
        if (expression === notificationCenterAffordanceScript) {
          return { centerVisible: false, candidateCount: 1, truncated: false, point: { x: 4, y: 5 } };
        }
        if (expression === notificationCenterScrollStateScript) {
          return { centerCount: 1, scrollableCount: 0, atStart: true, atEnd: true, point: null, deltaY: 0 };
        }
        throw new Error('unexpected retained activation expression');
      },
      send: async (method: string, params?: Record<string, unknown>) => {
        sentEvents.push({ method, params });
        onSend?.();
        return {};
      },
    }) as unknown as CdpConnection;
  const activate = async (
    variant: 'target' | 'absent' | 'wrong-project' | 'ambiguous' | (() => 'target' | 'absent' | 'wrong-project' | 'ambiguous'),
    options: {
      document?: { targetId: string; invalidated: boolean; dispose: () => void } | null;
      input?: RegenerationInputTracker;
      deadline?: number;
      onSend?: () => void;
      now?: () => number;
      poll?: (remainingMs: number) => Promise<void>;
      sentEvents?: Array<{ method: string; params?: Record<string, unknown> }>;
    } = {}
  ) => {
    const sentEvents = options.sentEvents ?? [];
    let captureCount = 0;
    const document =
      options.document === null
        ? undefined
        : (options.document ?? { targetId: 'owned-target', invalidated: false, dispose: () => undefined });
    const result = await activateRetainedRegenerationInitialization({
      cdp: activationCdp(sentEvents, options.onSend),
      input: options.input ?? new RegenerationInputTracker(),
      expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
      appDir,
      deadline: options.deadline ?? Date.now() + 5000,
      now: options.now,
      expectedTargetId: 'owned-target',
      expectedTimeOrigin: 42,
      expectedContextGeneration: 1,
      admittedDocument: document,
      sampler: async () => ({
        before: owner,
        owner,
        raw: activationRaw(sentEvents.length >= 3, typeof variant === 'function' ? variant() : variant),
      }),
      poll: options.poll,
      capture: async () => {
        captureCount++;
      },
    });
    return { result, sentEvents, captureCount };
  };
  for (const admittedDocument of [undefined, { targetId: 'owned-target', invalidated: true, dispose: () => undefined }]) {
    const noDocumentInput: Array<{ method: string; params?: Record<string, unknown> }> = [];
    let noDocumentCaptureCount = 0;
    await assert.rejects(
      activateRetainedRegenerationInitialization({
        cdp: activationCdp(noDocumentInput),
        input: new RegenerationInputTracker(),
        expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
        appDir,
        deadline: Date.now() + 5000,
        expectedTargetId: 'owned-target',
        expectedTimeOrigin: 42,
        expectedContextGeneration: 1,
        admittedDocument,
        sampler: async () => ({ before: owner, owner, raw: activationRaw(true, 'target') }),
        capture: async () => {
          noDocumentCaptureCount++;
        },
      }),
      /requires an unchanged admitted main-document identity/
    );
    assert.deepStrictEqual(noDocumentInput, [], 'Missing or invalid admitted main-document identity must fail before all input');
    assert.strictEqual(noDocumentCaptureCount, 0, 'Missing document authority must fail before retained-prompt evidence capture');
  }
  const activated = await activate('target');
  assert.strictEqual(activated.result.timeOrigin, 42);
  assert.strictEqual(activated.result.inspection.openedByDiagnostic, true);
  assert.strictEqual(activated.captureCount, 1, 'The retained prompt must be captured once before its real Yes');
  assert.strictEqual(
    activated.sentEvents.filter((event) => event.params?.type === 'mousePressed').length,
    2,
    'Exactly one physical bell click and one retained Yes click are allowed'
  );
  assert.strictEqual(
    activated.sentEvents.filter((event) => event.params?.type === 'mouseReleased').length,
    2,
    'Both physical clicks must complete through trusted input'
  );
  assert.strictEqual(
    activated.sentEvents.filter((event) => event.params?.type === 'mousePressed' && event.params.x === 8 && event.params.y === 9).length,
    1,
    'The retained warning Yes must be pressed exactly once'
  );

  const runPagedActivation = async (targetIdentitiesByPage: readonly (readonly string[])[], initialPage: number) => {
    let page = initialPage;
    let captureCount = 0;
    const events: string[] = [];
    const sentEvents: Array<{ method: string; params?: Record<string, unknown> }> = [];
    const baseTarget = activationRaw(true, 'target').candidates[0];
    const cdp = {
      targetId: 'owned-target',
      contextGeneration: 1,
      evaluate: async (_contextId: number | undefined, expression: string) => {
        if (expression === notificationCenterScrollStateScript) {
          events.push(`scroll-state:${page}`);
          return {
            centerCount: 1,
            scrollableCount: 1,
            atStart: page === 0,
            atEnd: page === targetIdentitiesByPage.length - 1,
            point: { x: 6, y: 7 },
            deltaY: 200,
          };
        }
        throw new Error('unexpected paged activation expression');
      },
      send: async (method: string, params?: Record<string, unknown>) => {
        sentEvents.push({ method, params });
        if (method === 'Input.dispatchMouseEvent' && params?.type === 'mouseWheel') {
          const direction = Number(params.deltaY) > 0 ? 1 : -1;
          page = Math.max(0, Math.min(targetIdentitiesByPage.length - 1, page + direction));
          events.push(`wheel:${direction}:${page}`);
        } else if (params?.type === 'mousePressed') {
          events.push(`press:${String(params.x)}:${String(params.y)}`);
        }
        return {};
      },
    } as unknown as CdpConnection;
    const result = await activateRetainedRegenerationInitialization({
      cdp,
      input: new RegenerationInputTracker(),
      expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
      appDir,
      deadline: Date.now() + 5000,
      expectedTargetId: 'owned-target',
      expectedTimeOrigin: 42,
      expectedContextGeneration: 1,
      admittedDocument: { targetId: 'owned-target', invalidated: false, dispose: () => undefined },
      sampler: async () => {
        const identities = targetIdentitiesByPage[page];
        return {
          before: owner,
          owner,
          raw: {
            ...activationRaw(true, 'absent'),
            retainedCount: identities.length,
            candidates: identities.map((semanticIdentity) => ({ ...baseTarget, semanticIdentity })),
          },
        };
      },
      capture: async () => {
        captureCount++;
        events.push('capture');
      },
    });
    return { result, events, sentEvents, captureCount };
  };
  const initiallyBottom = await runPagedActivation([['data-index:0'], []], 1);
  assert.strictEqual(initiallyBottom.captureCount, 1, 'The unique target above the initial bottom position must be reacquired');
  assert.strictEqual(
    initiallyBottom.sentEvents.filter((event) => event.params?.type === 'mousePressed' && event.params.x === 8 && event.params.y === 9)
      .length,
    1
  );
  const bottomProofIndex = initiallyBottom.events.lastIndexOf('scroll-state:1');
  const targetPressIndex = initiallyBottom.events.indexOf('press:8:9');
  assert.ok(
    bottomProofIndex >= 0 && targetPressIndex > bottomProofIndex,
    'Retained Yes cannot be pressed before verified-bottom uniqueness'
  );
  assert.ok(
    initiallyBottom.events.indexOf('wheel:-1:0') < initiallyBottom.events.indexOf('wheel:1:1'),
    'Every full scan must normalize to the top before scanning toward the bottom'
  );
  assert.ok(
    initiallyBottom.events.lastIndexOf('wheel:-1:0') > bottomProofIndex,
    'The unique target must be restored and reacquired after the completed full scan'
  );

  const duplicateEvents: Array<{ method: string; params?: Record<string, unknown> }> = [];
  await assert.rejects(
    (async () => {
      let page = 0;
      const baseTarget = activationRaw(true, 'target').candidates[0];
      await activateRetainedRegenerationInitialization({
        cdp: {
          targetId: 'owned-target',
          contextGeneration: 1,
          evaluate: async (_contextId: number | undefined, expression: string) => {
            if (expression === notificationCenterScrollStateScript) {
              return {
                centerCount: 1,
                scrollableCount: 1,
                atStart: page === 0,
                atEnd: page === 1,
                point: { x: 6, y: 7 },
                deltaY: 200,
              };
            }
            throw new Error('unexpected duplicate-page expression');
          },
          send: async (method: string, params?: Record<string, unknown>) => {
            duplicateEvents.push({ method, params });
            if (params?.type === 'mouseWheel') {
              page = Number(params.deltaY) > 0 ? 1 : 0;
            }
            return {};
          },
        } as unknown as CdpConnection,
        input: new RegenerationInputTracker(),
        expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
        appDir,
        deadline: Date.now() + 5000,
        expectedTargetId: 'owned-target',
        expectedTimeOrigin: 42,
        expectedContextGeneration: 1,
        admittedDocument: { targetId: 'owned-target', invalidated: false, dispose: () => undefined },
        sampler: async () => ({
          before: owner,
          owner,
          raw: {
            ...activationRaw(true, 'absent'),
            retainedCount: 1,
            candidates: [{ ...baseTarget, semanticIdentity: `data-index:${page}` }],
          },
        }),
        capture: async () => {
          throw new Error('Duplicate targets must fail before capture');
        },
      });
    })(),
    /could not be activated safely: blocking-or-ambiguous-ui/
  );
  assert.strictEqual(
    duplicateEvents.filter((event) => event.params?.type === 'mousePressed').length,
    0,
    'Duplicate exact targets on separate virtualized pages must fail before retained Yes'
  );

  let delayedNow = 0;
  let delayedTargetVisible = false;
  let delayedPollCount = 0;
  const delayedEvents: Array<{ method: string; params?: Record<string, unknown> }> = [];
  const delayed = await activate(() => (delayedTargetVisible ? 'target' : 'absent'), {
    deadline: 300,
    now: () => delayedNow,
    poll: async (remainingMs) => {
      delayedPollCount++;
      delayedNow += Math.min(100, remainingMs);
      delayedTargetVisible = true;
    },
    sentEvents: delayedEvents,
  });
  assert.strictEqual(delayedPollCount, 1, 'An initially empty open center must be re-sampled for live list updates');
  assert.strictEqual(delayed.result.timeOrigin, 42);
  assert.strictEqual(
    delayedEvents.filter((event) => event.params?.type === 'mousePressed' && event.params.x === 4 && event.params.y === 5).length,
    1,
    'Delayed retained activation may reveal the bell only once'
  );
  assert.strictEqual(
    delayedEvents.filter((event) => event.params?.type === 'mousePressed' && event.params.x === 8 && event.params.y === 9).length,
    1,
    'The later retained target must be clicked once without replay'
  );

  let absentNow = 0;
  let absentPollCount = 0;
  const absentEvents: Array<{ method: string; params?: Record<string, unknown> }> = [];
  await assert.rejects(
    activate('absent', {
      deadline: 300,
      now: () => absentNow,
      poll: async (remainingMs) => {
        absentPollCount++;
        absentNow += Math.min(100, remainingMs);
      },
      sentEvents: absentEvents,
    }),
    /absent from Notification Center before the original deadline/
  );
  assert.strictEqual(absentNow, 300, 'Persistent absence must consume the complete original deadline');
  assert.strictEqual(absentPollCount, 3);
  assert.strictEqual(
    absentEvents.filter((event) => event.params?.type === 'mousePressed' && event.params.x === 4 && event.params.y === 5).length,
    1,
    'Persistent absence must not reveal the bell again'
  );
  assert.strictEqual(
    absentEvents.filter((event) => event.params?.type === 'mousePressed' && event.params.x === 8 && event.params.y === 9).length,
    0,
    'Persistent absence must never fabricate or replay retained Yes'
  );

  let openNow = 0;
  let openWaitCount = 0;
  const openTimeoutEvents: Array<{ method: string; params?: Record<string, unknown> }> = [];
  await assert.rejects(
    activateRetainedRegenerationInitialization({
      cdp: activationCdp(openTimeoutEvents),
      input: new RegenerationInputTracker(),
      expectation: { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
      appDir,
      deadline: 5000,
      now: () => openNow,
      expectedTargetId: 'owned-target',
      expectedTimeOrigin: 42,
      expectedContextGeneration: 1,
      admittedDocument: { targetId: 'owned-target', invalidated: false, dispose: () => undefined },
      sampler: async () => ({ before: owner, owner, raw: activationRaw(false, 'absent') }),
      poll: async (remainingMs) => {
        openWaitCount++;
        openNow += Math.min(500, remainingMs);
      },
      capture: async () => {
        throw new Error('A center that never opens cannot capture a retained target');
      },
    }),
    /could not be activated safely: open-timeout/
  );
  assert.strictEqual(openNow, 2000, 'Center-open wait must terminate at its bounded timeout under the injected clock');
  assert.strictEqual(openWaitCount, 4, 'Center-open retries must yield through the injected wait between reads');
  assert.strictEqual(
    openTimeoutEvents.filter((event) => event.params?.type === 'mousePressed' && event.params.x === 4 && event.params.y === 5).length,
    1,
    'Center-open timeout must never click the bell again'
  );

  let wrongProjectNow = 0;
  await assert.rejects(
    activate('wrong-project', {
      deadline: 200,
      now: () => wrongProjectNow,
      poll: async (remainingMs) => {
        wrongProjectNow += Math.min(100, remainingMs);
      },
    }),
    /absent from Notification Center before the original deadline/
  );
  assert.strictEqual(wrongProjectNow, 200, 'Wrong-project retained items are non-matches until the original deadline');
  await assert.rejects(activate('ambiguous'), /could not be activated safely/);
  await assert.rejects(activate('target', { deadline: Date.now() - 1 }), /absent from Notification Center before the original deadline/);

  const invalidatedTargetDocument = { targetId: 'owned-target', invalidated: false, dispose: () => undefined };
  const invalidatedTargetInput = new RegenerationInputTracker();
  let retainedDispatchCount = 0;
  await assert.rejects(
    activate('target', {
      document: invalidatedTargetDocument,
      input: invalidatedTargetInput,
      onSend: () => {
        retainedDispatchCount++;
        if (retainedDispatchCount === 5) {
          invalidatedTargetDocument.invalidated = true;
        }
      },
    }),
    /could not be activated safely/
  );
  assert.strictEqual(retainedDispatchCount, 5, 'Identity invalidation after retained Yes press must prevent its release');
  assert.strictEqual(invalidatedTargetInput.uncertain, true);
  assert.strictEqual(invalidatedTargetInput.pendingInvalid, true);

  let listener: ((event: CdpConsoleDiagnostic) => void) | undefined;
  let ownedRead: (() => void) | undefined;
  let ownershipReadCount = 0;
  const sawOwned = new Promise<void>((resolve) => {
    ownedRead = resolve;
  });
  const fake = {
    contextGeneration: 1,
    onConsoleDiagnostic: (callback: (event: CdpConsoleDiagnostic) => void) => {
      listener = callback;
      return () => {
        listener = undefined;
      };
    },
    send: async () => ({ result: {} }),
    evaluate: async (_context: unknown, expression: string) => {
      if (expression === regenerationDiagnosticDomScript) {
        return { ...raw, sampledAtMs: Date.now() };
      }
      ownershipReadCount++;
      if (ownershipReadCount >= 2) {
        ownedRead?.();
      }
      return { timeOrigin: 42, title: 'unit (workspace) - Visual Studio Code', ready: true, roots: ['private-app-path'] };
    },
  } as unknown as CdpConnection;
  const probe = armBoundUnitProbe(root, 'root-single', invocation, identity);
  const observation = new RegenerationObservation(
    root,
    'root-single',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(observation);
  observation.boundary('phase-start');
  observation.onConnection(fake);
  listener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: 1 });
  observation.start(fake, 42);
  listener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: 2 });
  let initialTimeout: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      sawOwned,
      new Promise<never>((_resolve, reject) => {
        initialTimeout = setTimeout(() => reject(new Error('Detector did not sample the modeled owned workbench')), 2000);
      }),
    ]);
  } finally {
    clearTimeout(initialTimeout);
  }
  await (observation as unknown as { inFlight?: Promise<void> }).inFlight;
  listener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: 1 });
  listener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: null });
  await advanceUnitClock();
  for (let index = 0; index < 150; index++) {
    listener?.({ source: 'runtime', type: 'private-console-secret', severity: 'error', timestamp: Date.now() });
  }
  const decisionAt = Date.now();
  observation.boundary('decision');
  const decisionState = await observation.stopAndSample();
  assert.strictEqual(decisionState?.centerVisible, false);
  raw.centerVisible = true;
  const revealedState = await observation.stopAndSample();
  raw.centerVisible = false;
  assert.strictEqual(revealedState?.centerVisible, true);
  listener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  observation.recordNotificationCenterInspection(inspection);
  observation.boundary('teardown-start');
  await observation.finish(decisionAt);
  await finishBoundUnitProbe(probe, decisionAt);
  const timeline = fs.readFileSync(path.join(root, 'root-single-detector-timeline.jsonl'), 'utf8');
  const diagnostic = fs.readFileSync(path.join(root, 'root-single-diagnostic-summary.json'), 'utf8');
  assert.ok(!timeline.includes('private-') && !timeline.includes(root));
  assert.ok(!diagnostic.includes('private-') && !diagnostic.includes(root));
  const parsed = JSON.parse(diagnostic);
  assert.strictEqual(parsed.detector.preAttachUnobserved, true);
  assert.strictEqual(parsed.detector.samplingIsDiscrete, true);
  assert.strictEqual(parsed.notification.centerVisible, false, 'The summary must retain the first post-decision state');
  assert.deepStrictEqual(parsed.notificationCenterInspection, inspection);
  assert.deepStrictEqual(parsed.input, { uncertain: false, pending: false, pendingInvalid: false });
  assert.ok(parsed.console.droppedCount > 0, 'Console telemetry must remain bounded');
  assert.strictEqual(parsed.console.preOwnedDiscardedCount, 5, 'Buffered and unverified console events are count-only');
  const timelineEvents = timeline
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const phaseStart = timelineEvents.find((event) => event.event === 'phase-start');
  assert.strictEqual(phaseStart?.phaseStartedAtUtc, parsed.phaseStartedAtUtc);
  assert.strictEqual(phaseStart?.acceptanceDeadlineUtc, parsed.acceptanceDeadlineUtc);
  const finalSample = timelineEvents.find((event) => event.event === 'detector-poll' && event.finalSample === true);
  assert.strictEqual(finalSample?.outcome, 'observed');
  assert.ok(Date.parse(finalSample.sampledAtUtc) >= decisionAt, 'The final poll must independently cover the decision time');
  const revealedSample = timelineEvents.filter((event) => event.event === 'detector-poll' && event.finalSample === true).at(-1);
  assert.strictEqual(revealedSample?.state?.centerVisible, true, 'A later notification-center reveal remains separately observable');
  assert.deepStrictEqual(
    {
      ...timelineEvents.find((event) => event.event === 'notification-center-inspection'),
      sequence: 0,
      timestampUtc: '',
    },
    {
      schemaVersion: 1,
      invocation,
      phase: 'root-single',
      sequence: 0,
      timestampUtc: '',
      event: 'notification-center-inspection',
      ...inspection,
    }
  );
  assert.ok(
    timelineEvents.filter((event) => event.event === 'detector-poll' && event.outcome === 'observed').length >= 2,
    'An unchanged final state must still produce its own poll record'
  );
  let owned = true;
  let contextGeneration = 1;
  let changingListener: ((event: CdpConsoleDiagnostic) => void) | undefined;
  const changingCdp = {
    get contextGeneration() {
      return contextGeneration;
    },
    onConsoleDiagnostic: (callback: (event: CdpConsoleDiagnostic) => void) => {
      changingListener = callback;
      return () => {
        changingListener = undefined;
      };
    },
    send: async () => ({ result: {} }),
    evaluate: async (_context: unknown, expression: string) => {
      if (expression === regenerationDiagnosticDomScript) {
        return { ...raw, sampledAtMs: Date.now() };
      }
      return { timeOrigin: 42, title: 'unit (workspace) - Visual Studio Code', ready: true, roots: owned ? ['private-app-path'] : [] };
    },
  } as unknown as CdpConnection;
  const lost = new RegenerationObservation(
    root,
    'root-multiple',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(lost);
  lost.onConnection(changingCdp);
  lost.start(changingCdp, 42);
  const controlledLost = lost as unknown as { timer?: NodeJS.Timeout; sample: (deadline: number) => Promise<void> };
  clearTimeout(controlledLost.timer);
  const sampleLost = controlledLost.sample.bind(lost);
  changingListener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  await sampleLost(Date.now() + 1000);
  changingListener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: 1 });
  await advanceUnitClock();
  changingListener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  contextGeneration++;
  await advanceUnitClock();
  changingListener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  await sampleLost(Date.now() + 1000);
  owned = false;
  await sampleLost(Date.now() + 1000);
  changingListener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  owned = true;
  await sampleLost(Date.now() + 1000);
  await advanceUnitClock();
  changingListener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  const lostDecision = Date.now();
  await lost.stopAndSample();
  await lost.finish(lostDecision);
  const lostSummary = JSON.parse(fs.readFileSync(path.join(root, 'root-multiple-diagnostic-summary.json'), 'utf8'));
  const lostEvents = fs
    .readFileSync(path.join(root, 'root-multiple-detector-timeline.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const unownedEvent = lostEvents.find((event) => event.reason === 'workspace-root-unproved');
  assert.ok(unownedEvent);
  assert.strictEqual(unownedEvent.state, undefined, 'Candidate state from an unowned target must not be published');
  assert.strictEqual(lostSummary.detector.ownershipLossCount, 1);
  assert.strictEqual(lostSummary.detector.decisionCovered, false);
  assert.strictEqual(lostSummary.detector.availability, 'partial', 'Reacquisition cannot erase an earlier ownership gap');
  assert.strictEqual(lostSummary.console.eventCount, 2, 'Only events inside proved ownership intervals are attributed');
  assert.strictEqual(lostSummary.console.preOwnedDiscardedCount, 4, 'Buffered, changed-context and gap events are count-only');

  let writeListener: ((event: CdpConsoleDiagnostic) => void) | undefined;
  const writeFailureCdp = {
    onConsoleDiagnostic: (callback: (event: CdpConsoleDiagnostic) => void) => {
      writeListener = callback;
      return () => {
        writeListener = undefined;
      };
    },
    send: async () => ({ result: {} }),
    evaluate: async (_context: unknown, expression: string) =>
      expression === regenerationDiagnosticDomScript
        ? { ...raw, sampledAtMs: Date.now() }
        : { timeOrigin: 42, title: 'unit (workspace) - Visual Studio Code', ready: true, roots: ['private-app-path'] },
  } as unknown as CdpConnection;
  const writeFailure = new RegenerationObservation(
    root,
    'write-failure',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(writeFailure);
  writeFailure.onConnection(writeFailureCdp);
  writeFailure.start(writeFailureCdp, 42);
  const controlledWrite = writeFailure as unknown as {
    fd?: number;
    timer?: NodeJS.Timeout;
    sample: (deadline: number) => Promise<void>;
  };
  clearTimeout(controlledWrite.timer);
  await controlledWrite.sample(Date.now() + 1000);
  await advanceUnitClock();
  assert.notStrictEqual(controlledWrite.fd, undefined);
  fs.closeSync(controlledWrite.fd!);
  writeListener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  await writeFailure.finish(Date.now());
  const writeSummary = JSON.parse(fs.readFileSync(path.join(root, 'write-failure-diagnostic-summary.json'), 'utf8'));
  assert.strictEqual(writeSummary.detector.writeFailed, true);
  assert.strictEqual(writeSummary.console.availability, 'unavailable', 'A failed timeline cannot claim console capture');
  assert.strictEqual(writeSummary.console.recordedCount, 0);
  assert.strictEqual(writeSummary.console.droppedCount, 1);

  const failingCdp = {
    onConsoleDiagnostic: () => () => undefined,
    send: async () => ({ result: {} }),
    evaluate: async () => {
      throw new Error('private-cdp-failure');
    },
  } as unknown as CdpConnection;
  const failing = new RegenerationObservation(
    root,
    'root-repeat',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(failing);
  failing.onConnection(failingCdp);
  failing.start(failingCdp, 42);
  const failedDecision = Date.now();
  await failing.stopAndSample();
  await failing.finish(failedDecision);
  const failedEvents = fs
    .readFileSync(path.join(root, 'root-repeat-detector-timeline.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const failedFinal = failedEvents.find((event) => event.event === 'detector-poll' && event.finalSample === true);
  assert.strictEqual(failedFinal?.outcome, 'unavailable');
  assert.strictEqual(failedFinal.sampledAtUtc, null);
  const failedSummary = JSON.parse(fs.readFileSync(path.join(root, 'root-repeat-diagnostic-summary.json'), 'utf8'));
  assert.strictEqual(failedSummary.detector.finalSampleSucceeded, false);
  assert.strictEqual(failedSummary.detector.decisionCovered, false);

  let canSample = false;
  const recoveringCdp = {
    contextGeneration: 1,
    onConsoleDiagnostic: () => () => undefined,
    send: async () => ({ result: {} }),
    evaluate: async (_context: unknown, expression: string) => {
      if (!canSample) {
        throw new Error('private-cdp-failure');
      }
      return expression === regenerationDiagnosticDomScript
        ? { ...raw, sampledAtMs: Date.now() }
        : { timeOrigin: 42, title: 'unit (workspace) - Visual Studio Code', ready: true, roots: ['private-app-path'] };
    },
  } as unknown as CdpConnection;
  const recovering = new RegenerationObservation(
    root,
    'recovering-sample',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(recovering);
  recovering.onConnection(recoveringCdp);
  recovering.start(recoveringCdp, 42);
  const recoveringDecision = Date.now();
  assert.strictEqual(await recovering.stopAndSample(), undefined);
  canSample = true;
  assert.strictEqual((await recovering.stopAndSample())?.centerVisible, false);
  await recovering.finish(recoveringDecision);
  const recoveredSummary = JSON.parse(fs.readFileSync(path.join(root, 'recovering-sample-diagnostic-summary.json'), 'utf8'));
  assert.strictEqual(recoveredSummary.notification, null, 'A failed first decision sample must not be replaced by a later sample');
  assert.strictEqual(recoveredSummary.detector.finalSampleSucceeded, true, 'Coverage checks still use the latest sample');

  const registrationFailureCdp = {
    onConsoleDiagnostic: () => {
      throw new Error('private-registration-error');
    },
    send: async () => ({ result: {} }),
    evaluate: async (_context: unknown, expression: string) =>
      expression === regenerationDiagnosticDomScript
        ? { ...raw, sampledAtMs: Date.now() }
        : { timeOrigin: 42, title: 'unit (workspace) - Visual Studio Code', ready: true, roots: ['private-app-path'] },
  } as unknown as CdpConnection;
  const noRegistration = new RegenerationObservation(
    root,
    'baseline',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(noRegistration);
  noRegistration.onConnection(registrationFailureCdp);
  noRegistration.start(registrationFailureCdp, 42);
  const registrationDecision = Date.now();
  await noRegistration.stopAndSample();
  await noRegistration.finish(registrationDecision);
  const registrationSummary = JSON.parse(fs.readFileSync(path.join(root, 'baseline-diagnostic-summary.json'), 'utf8'));
  assert.strictEqual(registrationSummary.console.listenerRegistration, 'failed');
  assert.strictEqual(registrationSummary.console.availability, 'unavailable');

  const listenerFailureCdp = {
    onConsoleDiagnostic: (_listener: unknown, onFailure: () => void) => {
      onFailure();
      return () => undefined;
    },
    send: async () => ({ result: {} }),
    evaluate: async (_context: unknown, expression: string) =>
      expression === regenerationDiagnosticDomScript
        ? { ...raw, sampledAtMs: Date.now() }
        : { timeOrigin: 42, title: 'unit (workspace) - Visual Studio Code', ready: true, roots: ['private-app-path'] },
  } as unknown as CdpConnection;
  const listenerFailure = new RegenerationObservation(
    root,
    'vscode-repeat',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(listenerFailure);
  listenerFailure.onConnection(listenerFailureCdp);
  listenerFailure.start(listenerFailureCdp, 42);
  const listenerDecision = Date.now();
  await listenerFailure.stopAndSample();
  await listenerFailure.finish(listenerDecision);
  const listenerSummary = JSON.parse(fs.readFileSync(path.join(root, 'vscode-repeat-diagnostic-summary.json'), 'utf8'));
  assert.strictEqual(listenerSummary.console.listenerRegistration, 'registered');
  assert.strictEqual(listenerSummary.console.listenerFailureCount, 1);
  assert.strictEqual(listenerSummary.console.availability, 'unavailable');

  let bracketReadCount = 0;
  const lostDuringSampleCdp = {
    onConsoleDiagnostic: () => () => undefined,
    send: async () => ({ result: {} }),
    evaluate: async (_context: unknown, expression: string) => {
      if (expression === regenerationDiagnosticDomScript) {
        return { ...raw, sampledAtMs: Date.now() };
      }
      bracketReadCount++;
      return {
        timeOrigin: 42,
        title: 'unit (workspace) - Visual Studio Code',
        ready: true,
        roots: bracketReadCount === 1 ? ['private-app-path'] : [],
      };
    },
  } as unknown as CdpConnection;
  const lostDuringSample = new RegenerationObservation(
    root,
    'owner-bracket',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(lostDuringSample);
  lostDuringSample.onConnection(lostDuringSampleCdp);
  lostDuringSample.start(lostDuringSampleCdp, 42);
  await lostDuringSample.finish(Date.now());
  const bracketSummary = JSON.parse(fs.readFileSync(path.join(root, 'owner-bracket-diagnostic-summary.json'), 'utf8'));
  const bracketEvents = fs
    .readFileSync(path.join(root, 'owner-bracket-detector-timeline.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.strictEqual(bracketSummary.detector.ownershipLossCount, 1);
  assert.strictEqual(bracketSummary.detector.decisionCovered, false);
  assert.strictEqual(bracketEvents.find((event) => event.reason === 'workspace-root-unproved')?.state, undefined);

  const changedDocumentCdp = {
    onConsoleDiagnostic: () => () => undefined,
    send: async () => ({ result: {} }),
    evaluate: async (_context: unknown, expression: string) =>
      expression === regenerationDiagnosticDomScript
        ? { ...raw, sampledAtMs: Date.now() }
        : { timeOrigin: 43, title: 'unit (workspace) - Visual Studio Code', ready: true, roots: ['private-app-path'] },
  } as unknown as CdpConnection;
  const changedDocument = new RegenerationObservation(
    root,
    'document-mismatch',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(changedDocument);
  changedDocument.onConnection(changedDocumentCdp);
  changedDocument.start(changedDocumentCdp, 42);
  const changedDecision = Date.now();
  await changedDocument.stopAndSample();
  await changedDocument.finish(changedDecision);
  const changedSummary = JSON.parse(fs.readFileSync(path.join(root, 'document-mismatch-diagnostic-summary.json'), 'utf8'));
  const changedEvents = fs
    .readFileSync(path.join(root, 'document-mismatch-detector-timeline.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.strictEqual(changedSummary.detector.decisionCovered, false);
  assert.strictEqual(changedSummary.detector.ownershipLossCount, 1);
  assert.strictEqual(changedSummary.console.availability, 'unavailable');
  const mismatch = changedEvents.find((event) => event.reason === 'document-changed');
  assert.ok(mismatch);
  assert.strictEqual(mismatch.state, undefined, 'Candidate state from different documents is not published');

  const staleSampleCdp = {
    onConsoleDiagnostic: () => () => undefined,
    send: async () => ({ result: {} }),
    evaluate: async (_context: unknown, expression: string) =>
      expression === regenerationDiagnosticDomScript
        ? { ...raw, sampledAtMs: 1 }
        : { timeOrigin: 42, title: 'unit (workspace) - Visual Studio Code', ready: true, roots: ['private-app-path'] },
  } as unknown as CdpConnection;
  const staleSample = new RegenerationObservation(
    root,
    'stale-sample',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  enableLegacyLabelOnlyObservationModelForUnit(staleSample);
  staleSample.onConnection(staleSampleCdp);
  staleSample.start(staleSampleCdp, 42);
  const staleDecision = Date.now();
  await staleSample.stopAndSample();
  await staleSample.finish(staleDecision);
  const staleSummary = JSON.parse(fs.readFileSync(path.join(root, 'stale-sample-diagnostic-summary.json'), 'utf8'));
  assert.strictEqual(staleSummary.detector.decisionCovered, false);
  assert.strictEqual(staleSummary.detector.finalSampleSucceeded, false, 'A stale sample time cannot cover the decision');

  const noConnection = new RegenerationObservation(
    root,
    'no-connection',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
  const noConnectionDecision = Date.now();
  await noConnection.finish(noConnectionDecision);
  const noConnectionEvents = fs
    .readFileSync(path.join(root, 'no-connection-detector-timeline.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const noConnectionFinal = noConnectionEvents.find((event) => event.event === 'detector-poll' && event.finalSample === true);
  assert.strictEqual(noConnectionFinal?.outcome, 'unavailable');
  assert.strictEqual(noConnectionFinal.sampledAtUtc, null);
}

function testNativePublisherContract(root: string, invocation: string, identity: Record<string, string>): void {
  type PublishedProductRecord = {
    type: string;
    event?: string;
    availability?: string;
    eventCount?: number;
    collection?: { status?: string; coverageThroughDecision?: boolean };
    payload?: { result?: string };
  };
  type PublishedDetectorRecord = {
    type: string;
    event?: string;
    outcome?: string;
    finalSample?: boolean;
    sampledAtUtc?: string;
    summaryStatus?: string;
    availability?: string;
    summary?: {
      detector: { ownershipLossCount: number; finalSampleSucceeded: boolean };
      console: { listenerRegistration: string; listenerFailureCount: number };
    };
  };
  const { collectDetectorDiagnostics, collectProductDiagnostics } = require('../../../scripts/regeneration-diagnostic-publication') as {
    collectDetectorDiagnostics: (
      rootPath: string,
      phases: string[],
      family: string,
      enabled: boolean,
      expectedIdentity: Record<string, string>
    ) => PublishedDetectorRecord[];
    collectProductDiagnostics: (
      rootPath: string,
      phases: string[],
      family: string,
      enabled: boolean,
      expectedIdentity: Record<string, string>
    ) => PublishedProductRecord[];
  };
  const product = collectProductDiagnostics(root, ['vscode-single'], invocation, true, identity);
  assert.strictEqual(product.find((event) => event.type === 'product-capture')?.availability, 'available');
  assert.strictEqual(product.find((event) => event.type === 'product-capture')?.collection?.coverageThroughDecision, true);
  assert.ok(product.some((event) => event.event === 'warning-result' && event.payload?.result === 'dont-warn-again'));

  const tamperedRoot = path.join(root, 'publisher-gap');
  fs.mkdirSync(tamperedRoot);
  const phase = 'root-multiple';
  const armId = randomUUID();
  const initial = Date.now() - 12_000;
  const stamp = (offset: number) => new Date(initial + offset).toISOString();
  fs.writeFileSync(
    path.join(tamperedRoot, `${phase}-product-arming.json`),
    JSON.stringify({
      schemaVersion: 1,
      status: 'armed',
      suiteId: 'workspaceArtifactRegeneration',
      invocation,
      phase,
      armId,
      traceFile: `${phase}-product-events.jsonl`,
      identityBinding: createHmac('sha256', armId)
        .update(JSON.stringify(Object.entries(identity).sort(([a], [b]) => a.localeCompare(b))))
        .digest('hex'),
      armedAtUtc: stamp(0),
    })
  );
  const gapRecords = [
    { event: 'recorder-armed', offset: 2 },
    { event: 'activation-start', offset: 3 },
    { event: 'heartbeat', offset: 6100 },
    { event: 'heartbeat', offset: 6300 },
  ].map(({ event, offset }, index) => ({
    schemaVersion: 1,
    invocation,
    phase,
    armId,
    sequence: index + 1,
    timestampUtc: stamp(offset),
    event,
  }));
  const gapTrace = `${gapRecords.map((record) => JSON.stringify(record)).join('\n')}\n`;
  fs.writeFileSync(path.join(tamperedRoot, `${phase}-product-events.jsonl`), gapTrace);
  fs.writeFileSync(
    path.join(tamperedRoot, `${phase}-product-collection.json`),
    JSON.stringify({
      schemaVersion: 1,
      suiteId: 'workspaceArtifactRegeneration',
      invocation,
      phase,
      armId,
      availability: 'available',
      coverageThroughDecision: true,
      reason: 'complete',
      reasonCodes: [],
      partial: false,
      recordCount: gapRecords.length,
      lastSequence: gapRecords.length,
      heartbeatCount: 2,
      armedAtUtc: stamp(0),
      spawnRequestedAtUtc: stamp(1),
      spawnObservedAtUtc: stamp(2),
      decisionAtUtc: stamp(6200),
      lastEventAtUtc: stamp(6300),
      lastHeartbeatAtUtc: stamp(6300),
      traceByteLength: Buffer.byteLength(gapTrace),
      traceSha256: createHash('sha256').update(gapTrace).digest('hex'),
    })
  );
  const forgedCoverage = collectProductDiagnostics(tamperedRoot, [phase], invocation, true, identity);
  const forgedCapture = forgedCoverage.find((event) => event.type === 'product-capture');
  assert.strictEqual(forgedCapture?.collection?.status, 'ok');
  assert.strictEqual(forgedCapture?.eventCount, gapRecords.length);
  assert.notStrictEqual(forgedCapture?.availability, 'available', 'A forged receipt cannot hide a producer gap over five seconds');

  const eventOnly = collectProductDiagnostics(root, ['vscode-multiple'], invocation, true, identity);
  assert.strictEqual(
    eventOnly.find((event) => event.type === 'product-capture')?.availability,
    'available',
    'A fixed event can independently cover the decision without a later heartbeat'
  );
  assert.strictEqual(eventOnly.find((event) => event.type === 'product-capture')?.collection?.coverageThroughDecision, true);

  const published = collectDetectorDiagnostics(root, ['root-single'], invocation, true, identity);
  const publishedCapture = published.find((event) => event.type === 'detector-capture');
  assert.strictEqual(publishedCapture?.summaryStatus, 'ok', 'The sanitizer must accept the actual native detector summary');
  assert.strictEqual(publishedCapture?.availability, 'available', 'The sanitizer must verify this genuinely covered native timeline');
  assert.strictEqual(publishedCapture?.summary?.detector.ownershipLossCount, 0);
  assert.strictEqual(publishedCapture?.summary?.detector.finalSampleSucceeded, true);
  assert.strictEqual(publishedCapture?.summary?.console.listenerRegistration, 'registered');
  assert.strictEqual(publishedCapture?.summary?.console.listenerFailureCount, 0);
  const publishedFinal = published.find((event) => event.event === 'detector-poll' && event.finalSample === true);
  assert.strictEqual(publishedFinal?.outcome, 'observed', 'The sanitizer must retain the actual final post-decision poll');
  const nativeSummary = JSON.parse(fs.readFileSync(path.join(root, 'root-single-diagnostic-summary.json'), 'utf8'));
  assert.ok(Date.parse(publishedFinal?.sampledAtUtc ?? '') >= Date.parse(nativeSummary.decisionAtUtc));
  const boundProduct = collectProductDiagnostics(root, ['root-single'], invocation, true, identity);
  assert.strictEqual(boundProduct.find((event) => event.type === 'product-capture')?.availability, 'available');
  assert.ok(!JSON.stringify(published).includes('private-') && !JSON.stringify(published).includes(root));
}

async function advanceUnitClock(): Promise<void> {
  const previous = Date.now();
  do {
    await new Promise<void>((resolve) => setImmediate(resolve));
  } while (Date.now() <= previous);
}

if (require.main === module) {
  runRegenerationDiagnosticsControls().then(
    () => console.log('[workspaceArtifactRegenerationDiagnostics.unit] all tests passed'),
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    }
  );
}
