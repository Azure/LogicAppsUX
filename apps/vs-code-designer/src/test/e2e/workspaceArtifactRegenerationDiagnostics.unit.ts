import * as assert from 'assert';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { CdpConnection, CdpConsoleDiagnostic } from './cdpClient';
import {
  armRegenerationProbe,
  assessRegenerationProductCoverage,
  finishRegenerationProductCoverage,
  regenerationProbeVariables,
  validRegenerationProductPayload,
} from './workspaceArtifactRegenerationDiagnostics';
import {
  RegenerationInputTracker,
  RegenerationObservation,
  regenerationPromptObservationForLog,
  regenerationDiagnosticDomScript,
  sanitizeRegenerationDiagnosticState,
  summarizeRegenerationPromptObservation,
} from './workspaceArtifactRegenerationObservation';

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
      UNIT_ONLY: 'kept',
    };
    const canonical = armRegenerationProbe({ root, phase: 'baseline', invocation, identity, env: inherited });
    assert.strictEqual(canonical.requested, false);
    for (const variable of regenerationProbeVariables) {
      assert.strictEqual(canonical.childEnv[variable], undefined);
    }
    assert.strictEqual(canonical.childEnv.LA_E2E_CLI_DIAGNOSTIC_ONLY, undefined);
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
      ['activation-returned', undefined],
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
      ['warning-call-entered', { kind: 'initialization', warningId: 1 }],
      ['warning-call-returned', { kind: 'initialization', warningId: 1 }],
      ['warning-result', { kind: 'initialization', warningId: 1, result: 'dont-warn-again' }],
      ['warning-result', { kind: 'outdated', warningId: 2, result: 'undefined' }],
      ['warning-error', { kind: 'overwrite', warningId: 3, errorKind: 'non-error' }],
    ];
    for (const [event, payload] of variants) {
      assert.strictEqual(validRegenerationProductPayload(event, payload), true, `Producer event ${event} must be recognized`);
    }
    assert.strictEqual(validRegenerationProductPayload('recorder-overflow', { reason: 'queue-limit' }), true);
    assert.strictEqual(validRegenerationProductPayload('unrecognized-secret-text', undefined), false);
    assert.strictEqual(validRegenerationProductPayload('heartbeat', { message: 'private-secret' }), false);
    assert.strictEqual(validRegenerationProductPayload('consistency-check-skipped', { reason: { toString: 'private' } }), false);
    assert.strictEqual(validRegenerationProductPayload('warning-call-entered', { kind: { toString: 'private' }, warningId: 1 }), false);
    assert.strictEqual(
      validRegenerationProductPayload('warning-result', { kind: 'initialization', warningId: 1, result: 'private-secret' }),
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
    assert.ok(!JSON.stringify(coverage).includes('private-'));

    write(records.slice(0, -1));
    coverage = assessRegenerationProductCoverage(probe, decisionAt);
    assert.strictEqual(coverage.availability, 'unavailable');
    assert.strictEqual(coverage.partial, true);
    assert.strictEqual(coverage.coverageThroughDecision, false);
    assert.ok(coverage.reasonCodes.includes('coverage-through-decision-unproved'));
    const eventCoversDecision = [...records.slice(0, -1), { ...records.at(-1)!, event: 'activation-returned' }];
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
      phase: 'vscode-repeat',
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
      { event: 'recorder-armed', timestamp: eventOnlyArmed + 1 },
      { event: 'activation-start', timestamp: eventOnlyArmed + 2 },
      { event: 'activation-returned', timestamp: eventOnlyDecision + 1 },
    ].map(({ event, timestamp }, index) => ({
      schemaVersion: 1,
      invocation,
      phase: 'vscode-repeat',
      armId: eventOnly.receipt!.armId,
      sequence: index + 1,
      timestampUtc: new Date(timestamp).toISOString(),
      event,
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

    await testSafeDetectorAndInput(root, invocation);
    console.log('[workspaceArtifactRegenerationDiagnostics.unit] native controls passed');
    testNativePublisherContract(root, invocation);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testSafeDetectorAndInput(root: string, invocation: string): Promise<void> {
  const appDir = path.join(root, 'private-app-path');
  const prompt = (project: string) =>
    `Detected an Azure Logic App project "${project}" that may be missing files. Initialize for optimal use with VS Code? private-message`;
  const candidate = {
    kind: 'notification' as const,
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
  const observation = new RegenerationObservation(
    root,
    'root-single',
    invocation,
    Date.now() + 5000,
    { workspaceFilePath: path.join(root, 'unit.code-workspace'), rootPaths: [appDir] },
    appDir
  );
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
  await observation.stopAndSample();
  listener?.({ source: 'runtime', type: 'error', severity: 'error', timestamp: Date.now() });
  await observation.finish(decisionAt);
  const timeline = fs.readFileSync(path.join(root, 'root-single-detector-timeline.jsonl'), 'utf8');
  const diagnostic = fs.readFileSync(path.join(root, 'root-single-diagnostic-summary.json'), 'utf8');
  assert.ok(!timeline.includes('private-') && !timeline.includes(root));
  assert.ok(!diagnostic.includes('private-') && !diagnostic.includes(root));
  const parsed = JSON.parse(diagnostic);
  assert.strictEqual(parsed.detector.preAttachUnobserved, true);
  assert.strictEqual(parsed.detector.samplingIsDiscrete, true);
  assert.ok(parsed.console.droppedCount > 0, 'Console telemetry must remain bounded');
  assert.strictEqual(parsed.console.preOwnedDiscardedCount, 5, 'Buffered and unverified console events are count-only');
  const timelineEvents = timeline
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const finalSample = timelineEvents.find((event) => event.event === 'detector-poll' && event.finalSample === true);
  assert.strictEqual(finalSample?.outcome, 'observed');
  assert.ok(Date.parse(finalSample.sampledAtUtc) >= decisionAt, 'The final poll must independently cover the decision time');
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

function testNativePublisherContract(root: string, invocation: string): void {
  type PublishedProductRecord = {
    type: string;
    event?: string;
    availability?: string;
    eventCount?: number;
    collection?: { status?: string };
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
    collectDetectorDiagnostics: (rootPath: string, phases: string[], family: string, enabled: boolean) => PublishedDetectorRecord[];
    collectProductDiagnostics: (rootPath: string, phases: string[], family: string, enabled: boolean) => PublishedProductRecord[];
  };
  const product = collectProductDiagnostics(root, ['vscode-single'], invocation, true);
  assert.strictEqual(product.find((event) => event.type === 'product-capture')?.availability, 'available');
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
      identityBinding: 'a'.repeat(64),
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
  fs.writeFileSync(
    path.join(tamperedRoot, `${phase}-product-events.jsonl`),
    `${gapRecords.map((record) => JSON.stringify(record)).join('\n')}\n`
  );
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
    })
  );
  const forgedCoverage = collectProductDiagnostics(tamperedRoot, [phase], invocation, true);
  const forgedCapture = forgedCoverage.find((event) => event.type === 'product-capture');
  assert.strictEqual(forgedCapture?.collection?.status, 'ok');
  assert.strictEqual(forgedCapture?.eventCount, gapRecords.length);
  assert.notStrictEqual(forgedCapture?.availability, 'available', 'A forged receipt cannot hide a producer gap over five seconds');

  const eventOnly = collectProductDiagnostics(root, ['vscode-repeat'], invocation, true);
  assert.strictEqual(
    eventOnly.find((event) => event.type === 'product-capture')?.availability,
    'available',
    'A fixed event can independently cover the decision without a later heartbeat'
  );

  const published = collectDetectorDiagnostics(root, ['root-single'], invocation, true);
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
