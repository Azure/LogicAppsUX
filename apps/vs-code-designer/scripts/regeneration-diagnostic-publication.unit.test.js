/* global require */
const assert = require('node:assert/strict');
const { createHash, createHmac } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  collectDetectorDiagnostics,
  collectProductDiagnostics,
  projectProductEvent,
  publishProductDiagnostics,
  regenerationDiagnosticIdentity,
  stageDiagnosticAggregate,
} = require('./regeneration-diagnostic-publication');

const invocation = '11111111-1111-4111-8111-111111111111';
const armId = '22222222-2222-4222-8222-222222222222';
const phase = 'vscode-single';
const evidenceInvocation = 'workspaceArtifactRegeneration-33333333-3333-4333-8333-333333333333';
const identity = regenerationDiagnosticIdentity({}, evidenceInvocation);

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regeneration-publication-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const arming = {
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
    armedAtUtc: '2026-01-01T00:00:00.000Z',
    privateText: 'synthetic-private-arming-value',
  };
  const collection = {
    schemaVersion: 1,
    suiteId: 'workspaceArtifactRegeneration',
    invocation,
    phase,
    armId,
    availability: 'available',
    coverageThroughDecision: true,
    partial: false,
    reasonCodes: [],
    recordCount: 4,
    lastSequence: 4,
    heartbeatCount: 2,
    armedAtUtc: '2026-01-01T00:00:00.000Z',
    spawnRequestedAtUtc: '2026-01-01T00:00:00.500Z',
    spawnObservedAtUtc: '2026-01-01T00:00:00.900Z',
    decisionAtUtc: '2026-01-01T00:00:04.000Z',
    lastEventAtUtc: '2026-01-01T00:00:05.000Z',
    lastHeartbeatAtUtc: '2026-01-01T00:00:05.000Z',
    privateText: 'synthetic-private-collection-value',
  };
  const event = (sequence, timestampUtc, name, payload = {}) => ({
    schemaVersion: 1,
    invocation,
    phase,
    armId,
    sequence,
    timestampUtc,
    event: name,
    payload,
    privateText: 'synthetic-private-event-value',
  });
  const events = [
    event(1, '2026-01-01T00:00:01.000Z', 'recorder-armed'),
    event(2, '2026-01-01T00:00:01.100Z', 'activation-start'),
    event(3, '2026-01-01T00:00:03.000Z', 'heartbeat'),
    event(4, '2026-01-01T00:00:05.000Z', 'heartbeat'),
  ];
  const write = (name, value) => fs.writeFileSync(path.join(root, `${phase}-${name}`), value);
  const resnapshot = () => {
    const bytes = fs.readFileSync(path.join(root, `${phase}-product-events.jsonl`));
    collection.traceByteLength = bytes.length;
    collection.traceSha256 = createHash('sha256').update(bytes).digest('hex');
    write('product-collection.json', JSON.stringify(collection));
  };
  const writeAll = () => {
    write('product-arming.json', JSON.stringify(arming));
    write('product-events.jsonl', `${events.map((value) => JSON.stringify(value)).join('\n')}\n`);
    resnapshot();
  };
  return { root, arming, collection, event, events, productEvents: events, write, writeAll, resnapshot };
}

function detectorFixture(t) {
  const f = fixture(t);
  const state = {
    shellOwned: true,
    documentChanged: false,
    documentVisible: true,
    documentFocused: true,
    centerMounted: false,
    centerVisible: false,
    blockingUiVisible: false,
    truncated: false,
    toastCount: 1,
    retainedCount: 0,
    dnd: 'unknown',
    candidates: [{ category: 'initialization', kind: 'notification', yesCount: 0, reasonCodes: ['missing-yes'] }],
    text: 'synthetic-private-notification',
  };
  const event = (sequence, timestampUtc, name, extra = {}) => ({
    schemaVersion: 1,
    invocation,
    phase,
    sequence,
    timestampUtc,
    event: name,
    privateText: 'synthetic-private-detector',
    ...extra,
  });
  const events = [
    event(1, '2026-01-01T00:00:00.000Z', 'phase-start', {
      phaseStartedAtUtc: '2026-01-01T00:00:00.000Z',
      acceptanceDeadlineUtc: '2026-01-01T00:02:00.000Z',
    }),
    event(2, '2026-01-01T00:00:03.000Z', 'attach-owned'),
    event(3, '2026-01-01T00:00:03.000Z', 'detector-poll', {
      outcome: 'observed',
      pollCount: 1,
      sampleCount: 1,
      sampledAtUtc: '2026-01-01T00:00:03.000Z',
      finalSample: false,
      state,
    }),
    event(4, '2026-01-01T00:00:03.500Z', 'renderer-console', {
      source: 'runtime',
      type: 'error',
      severity: 'error',
      receivedAtUtc: '2026-01-01T00:00:03.400Z',
      message: 'synthetic-private-console-message',
    }),
    event(5, '2026-01-01T00:00:04.000Z', 'decision'),
    event(6, '2026-01-01T00:00:05.000Z', 'detector-poll', {
      outcome: 'observed',
      pollCount: 2,
      sampleCount: 2,
      sampledAtUtc: '2026-01-01T00:00:05.000Z',
      finalSample: true,
      state,
    }),
    event(7, '2026-01-01T00:00:06.000Z', 'teardown-start'),
  ];
  const capture = { status: 'unavailable', reason: 'not-attempted', checkpoint: null, postDeadline: false, registration: 'unavailable' };
  const summary = {
    schemaVersion: 1,
    suiteId: 'workspaceArtifactRegeneration',
    invocation,
    phase,
    phaseStartedAtUtc: '2026-01-01T00:00:00.000Z',
    acceptanceDeadlineUtc: '2026-01-01T00:02:00.000Z',
    acceptanceCutoffUtc: '2026-01-01T00:00:04.000Z',
    decisionAtUtc: '2026-01-01T00:00:04.000Z',
    attachmentScope: 'owned-regular-workbench',
    detector: {
      availability: 'available',
      decisionCovered: true,
      samplingIsDiscrete: true,
      preAttachUnobserved: true,
      attachAtUtc: '2026-01-01T00:00:03.000Z',
      firstSampleAtUtc: '2026-01-01T00:00:03.000Z',
      lastSampleAtUtc: '2026-01-01T00:00:05.000Z',
      pollCount: 2,
      sampleCount: 2,
      sampleErrorCount: 0,
      ownershipLossCount: 0,
      finalSampleSucceeded: true,
      maxSampleGapMs: 2000,
      timelineRecordCount: events.length,
      droppedCount: 0,
      writeFailed: false,
    },
    console: {
      availability: 'partial',
      scope: 'renderer-only',
      preAttachUnobserved: true,
      listenerRegistration: 'registered',
      listenerFailureCount: 0,
      eventCount: 1,
      recordedCount: 1,
      droppedCount: 0,
      preOwnedDiscardedCount: 0,
      logDomain: 'enabled',
    },
    notification: state,
    notificationSampledAtUtc: '2026-01-01T00:00:05.000Z',
    screenshots: { beforeTeardown: capture, notificationCenter: capture },
    input: { uncertain: false, pending: false },
    privatePath: 'synthetic-private-profile-path',
  };
  const writeDetector = () => {
    f.writeAll();
    f.write('detector-timeline.jsonl', `${events.map((value) => JSON.stringify(value)).join('\n')}\n`);
    f.write('diagnostic-summary.json', JSON.stringify(summary));
  };
  return { ...f, state, events, summary, writeDetector };
}

test('publishes only bound, allowlisted product events with independently checked coverage', (t) => {
  const f = fixture(t);
  f.events.splice(
    2,
    0,
    f.event(3, '2026-01-01T00:00:02.000Z', 'warning-call-entered', {
      kind: 'initialization',
      warningId: 1,
      checkId: 1,
      message: 'synthetic-private-notification',
    })
  );
  f.events[3].sequence = 4;
  f.events[4].sequence = 5;
  f.collection.recordCount = 5;
  f.collection.lastSequence = 5;
  f.writeAll();

  const records = collectProductDiagnostics(f.root, [phase], invocation, true, identity);

  assert.equal(records[0].availability, 'available');
  assert.equal(records[0].reason, 'coverage-confirmed');
  assert.deepEqual(records[3].payload, { kind: 'initialization', warningId: 1, checkId: 1 });
  assert.doesNotMatch(JSON.stringify(records), /synthetic-private|notification|regeneration-publication-/);
  assert.deepEqual(
    records.slice(1).map((value) => value.sequence),
    [1, 2, 3, 4, 5]
  );
});

test('does not publish an unsealed trace without the collection receipt', (t) => {
  const f = fixture(t);
  f.writeAll();
  fs.unlinkSync(path.join(f.root, `${phase}-product-collection.json`));

  const records = collectProductDiagnostics(f.root, [phase], invocation, true, identity);

  assert.equal(records[0].availability, 'unavailable');
  assert.equal(records[0].reason, 'collection-snapshot-unavailable');
  assert.equal(records.length, 1);
});

test('rejects gaps, overflow, unrecognized events, and truncated trace records', (t) => {
  for (const variant of ['gap', 'overflow', 'unrecognized', 'truncated']) {
    const f = fixture(t);
    if (variant === 'gap') {
      f.events[2].sequence = 4;
    } else if (variant === 'overflow') {
      f.events[2] = f.event(3, '2026-01-01T00:00:03.000Z', 'recorder-overflow', { reason: 'queue-limit' });
    } else if (variant === 'unrecognized') {
      f.events[2] = f.event(3, '2026-01-01T00:00:03.000Z', 'synthetic-private-event');
    }
    f.writeAll();
    if (variant === 'truncated') {
      f.write('product-events.jsonl', f.events.map((value) => JSON.stringify(value)).join('\n'));
      f.resnapshot();
    }
    const records = collectProductDiagnostics(f.root, [phase], invocation, true, identity);
    assert.equal(records[0].availability, 'partial', variant);
    assert.equal(records[0].reason, 'trace-incomplete', variant);
    assert.doesNotMatch(JSON.stringify(records), /synthetic-private/);
  }
});

test('requires a current arming receipt, activation marker and continuous decision coverage', (t) => {
  for (const variant of [
    'wrong-arming',
    'late-arming',
    'no-activation',
    'duplicate-activation',
    'future-event',
    'gap-in-heartbeats',
    'gap-between-five-and-seven-seconds',
    'gap-crossing-decision',
    'no-post-decision-heartbeat',
    'activation-after-decision',
    'missing-spawn',
    'receipt-prefix-mismatch',
    'receipt-arm-time-mismatch',
    'receipt-partial',
    'receipt-has-failure',
    'receipt-last-heartbeat-mismatch',
    'post-decision-heartbeat-outside-receipt',
    'missing-decision',
  ]) {
    const f = fixture(t);
    if (variant === 'wrong-arming') {
      f.arming.armId = '33333333-3333-4333-8333-333333333333';
    } else if (variant === 'late-arming') {
      f.arming.armedAtUtc = '2026-01-01T00:00:02.000Z';
    } else if (variant === 'no-activation') {
      f.events[1].event = 'heartbeat';
    } else if (variant === 'duplicate-activation') {
      f.events[2].event = 'activation-start';
      f.collection.heartbeatCount = 1;
    } else if (variant === 'future-event') {
      f.events[3].timestampUtc = new Date(Date.now() + 60_000).toISOString();
      f.collection.lastEventAtUtc = f.events[3].timestampUtc;
      f.collection.lastHeartbeatAtUtc = f.events[3].timestampUtc;
    } else if (variant === 'gap-in-heartbeats') {
      f.collection.decisionAtUtc = '2026-01-01T00:00:30.000Z';
    } else if (variant === 'gap-between-five-and-seven-seconds') {
      f.collection.decisionAtUtc = '2026-01-01T00:00:08.000Z';
      f.events[3].timestampUtc = '2026-01-01T00:00:08.500Z';
      f.collection.lastEventAtUtc = f.events[3].timestampUtc;
      f.collection.lastHeartbeatAtUtc = f.events[3].timestampUtc;
    } else if (variant === 'gap-crossing-decision') {
      f.collection.decisionAtUtc = '2026-01-01T00:00:09.000Z';
      f.events[3].timestampUtc = '2026-01-01T00:00:15.000Z';
    } else if (variant === 'no-post-decision-heartbeat') {
      f.events.pop();
    } else if (variant === 'activation-after-decision') {
      f.events[1].event = 'heartbeat';
      f.events[3].event = 'activation-start';
      f.events.push(f.event(5, '2026-01-01T00:00:06.000Z', 'heartbeat'));
    } else if (variant === 'missing-spawn') {
      f.collection.spawnObservedAtUtc = null;
    } else if (variant === 'receipt-prefix-mismatch') {
      f.collection.lastEventAtUtc = '2026-01-01T00:00:04.500Z';
    } else if (variant === 'receipt-arm-time-mismatch') {
      f.collection.armedAtUtc = '2025-12-31T23:59:59.000Z';
    } else if (variant === 'receipt-partial') {
      f.collection.partial = true;
    } else if (variant === 'receipt-has-failure') {
      f.collection.reasonCodes = ['trace-changing'];
    } else if (variant === 'receipt-last-heartbeat-mismatch') {
      f.collection.lastHeartbeatAtUtc = '2026-01-01T00:00:03.000Z';
    } else if (variant === 'post-decision-heartbeat-outside-receipt') {
      f.collection.recordCount = 3;
      f.collection.lastSequence = 3;
      f.collection.lastEventAtUtc = f.events[2].timestampUtc;
      f.collection.heartbeatCount = 1;
      f.collection.lastHeartbeatAtUtc = f.events[2].timestampUtc;
    } else {
      delete f.collection.decisionAtUtc;
    }
    f.writeAll();
    const records = collectProductDiagnostics(f.root, [phase], invocation, true, identity);
    assert.notEqual(records[0].availability, 'available', variant);
  }
});

test('accepts a contiguous producer event crossing the decision even without a heartbeat', (t) => {
  const f = fixture(t);
  f.events[2].event = 'consistency-check-entered';
  f.events[3].event = 'activation-returned';
  f.events[3].payload = { initialInvocationState: 'pending' };
  f.collection.heartbeatCount = 0;
  f.collection.lastHeartbeatAtUtc = null;
  f.writeAll();

  const [record] = collectProductDiagnostics(f.root, [phase], invocation, true, identity);
  assert.equal(record.availability, 'available');
  assert.equal(record.reason, 'coverage-confirmed');
});

test('preserves fixed arming failure codes without publishing raw error data', (t) => {
  const f = fixture(t);
  f.collection.armId = null;
  f.collection.availability = 'unavailable';
  f.collection.coverageThroughDecision = false;
  f.collection.reasonCodes = ['arming-failed'];
  f.collection.recordCount = 0;
  f.collection.lastSequence = 0;
  f.collection.heartbeatCount = 0;
  f.collection.traceByteLength = null;
  f.collection.traceSha256 = null;
  f.write('product-collection.json', JSON.stringify(f.collection));
  const [record] = collectProductDiagnostics(f.root, [phase], invocation, true, identity);
  assert.equal(record.reason, 'arming-missing');
  assert.deepEqual(record.collection.reasonCodes, ['arming-failed']);
  assert.doesNotMatch(JSON.stringify(record), /synthetic-private/);
});

test('records unavailable phase evidence without inventing whether the phase ran', (t) => {
  const f = fixture(t);
  const records = collectProductDiagnostics(f.root, [phase, 'root-single'], invocation, true, identity);
  assert.deepEqual(
    records.map(({ phase: entryPhase, availability, reason, attempted }) => ({ phase: entryPhase, availability, reason, attempted })),
    [
      { phase, availability: 'unavailable', reason: 'no-phase-evidence', attempted: 'unknown' },
      { phase: 'root-single', availability: 'unavailable', reason: 'no-phase-evidence', attempted: 'unknown' },
    ]
  );
  assert.deepEqual(collectProductDiagnostics(f.root, [phase], invocation, false, identity), []);
  assert.equal(collectProductDiagnostics(f.root, [phase], 'invalid', true, identity)[0].reason, 'invocation-unavailable');
  assert.throws(() => collectProductDiagnostics(f.root, ['../other'], invocation, true, identity), /Unregistered/);
});

test('rejects malformed or oversized inputs and never exposes their contents', (t) => {
  const f = fixture(t);
  f.writeAll();
  f.write('product-events.jsonl', `{"secret":"synthetic-private-malformed"`);
  f.resnapshot();
  const malformed = collectProductDiagnostics(f.root, [phase], invocation, true, identity);
  assert.equal(malformed[0].availability, 'unavailable');
  assert.doesNotMatch(JSON.stringify(malformed), /synthetic-private/);
  f.write('product-events.jsonl', 'a'.repeat(1024 * 1024 + 1));
  f.resnapshot();
  const oversized = collectProductDiagnostics(f.root, [phase], invocation, true, identity);
  assert.equal(oversized[0].reason, 'collection-snapshot-unavailable');
});

test('rejects unsafe values in the fixed event schema', () => {
  const binding = { invocation, phase, armId };
  const base = {
    schemaVersion: 1,
    ...binding,
    sequence: 1,
    timestampUtc: '2026-01-01T00:00:01.000Z',
  };
  assert.equal(
    projectProductEvent(
      {
        ...base,
        event: 'warning-result',
        payload: { kind: 'initialization', warningId: 1, checkId: 1, result: 'raw text', durationMs: 1 },
      },
      binding
    ),
    undefined
  );
  assert.deepEqual(
    projectProductEvent(
      {
        ...base,
        event: 'ensure-vscode-files-entered',
        payload: { origin: 'activation-initial', invocationSequence: 1, overlapCount: 0 },
      },
      binding
    ).payload,
    { origin: 'activation-initial', invocationSequence: 1, overlapCount: 0 }
  );
  assert.deepEqual(
    projectProductEvent(
      {
        ...base,
        event: 'warning-error',
        payload: { kind: 'initialization', warningId: 1, checkId: 1, errorKind: 'user-cancelled', durationMs: 10 },
      },
      binding
    ).payload,
    { kind: 'initialization', warningId: 1, checkId: 1, errorKind: 'user-cancelled', durationMs: 10 }
  );
  assert.equal(projectProductEvent({ ...base, event: 'activation-workspace', payload: { folderCount: -1 } }, binding), undefined);
  assert.equal(projectProductEvent({ ...base, event: 'unknown', payload: {} }, binding), undefined);
});

test('projects bounded detector, console, notification and screenshot evidence without raw content', (t) => {
  const f = detectorFixture(t);
  f.writeDetector();
  const records = collectDetectorDiagnostics(f.root, [phase], invocation, true, identity);

  assert.equal(records[0].availability, 'available');
  assert.equal(records[0].reason, 'sampled-coverage-confirmed');
  assert.equal(records[0].summary.detector.preAttachUnobserved, true);
  assert.equal(records[0].summary.detector.sampledOnly, true);
  assert.equal(records[0].summary.console.scope, 'renderer-only');
  assert.equal(records[4].consoleType, 'error');
  assert.deepEqual(records[0].summary.notification.candidates[0].reasonCodes, ['missing-yes']);
  assert.doesNotMatch(JSON.stringify(records), /synthetic-private/);
});

test('preserves closed-center and renderer-cleanup screenshot statuses', (t) => {
  for (const [status, reason] of [
    ['skipped', 'notification-center-not-open'],
    ['unavailable', 'renderer-cleanup-failed'],
  ]) {
    const f = detectorFixture(t);
    f.summary.screenshots.notificationCenter = { status, reason, checkpoint: null, postDeadline: true, registration: 'unavailable' };
    f.writeDetector();
    const records = collectDetectorDiagnostics(f.root, [phase], invocation, true, identity);
    assert.deepEqual(records[0].summary.screenshots.notificationCenter, {
      status,
      reason,
      postDeadline: true,
      registration: 'unavailable',
    });
  }
});

test('never asserts detector coverage for incomplete, unowned or unbound evidence', (t) => {
  for (const variant of [
    'missing-summary',
    'missing-post-decision-sample',
    'wrong-invocation',
    'lost-ownership',
    'document-changed',
    'sequence-gap',
    'dropped-record',
    'write-failed',
    'sample-gap',
    'ownership-gap',
    'final-sample-unproved',
    'sample-time-mismatch',
    'sample-after-emission',
    'truncated-state',
    'missing-decision-boundary',
    'inconsistent-console-count',
    'contradictory-unavailable-sample',
    'truncated-timeline',
    'invalid-candidate',
  ]) {
    const f = detectorFixture(t);
    if (variant === 'missing-post-decision-sample') {
      f.events.splice(5, 1);
      f.events[5].sequence = 6;
      f.summary.detector.timelineRecordCount = 6;
    } else if (variant === 'wrong-invocation') {
      f.summary.invocation = '33333333-3333-4333-8333-333333333333';
    } else if (variant === 'lost-ownership') {
      f.events[5].state = { ...f.state, shellOwned: false };
    } else if (variant === 'document-changed') {
      f.events[5].state = { ...f.state, documentChanged: true };
    } else if (variant === 'sequence-gap') {
      f.events[5].sequence = 10;
    } else if (variant === 'dropped-record') {
      f.summary.detector.droppedCount = 1;
    } else if (variant === 'write-failed') {
      f.summary.detector.writeFailed = true;
    } else if (variant === 'sample-gap') {
      f.summary.detector.maxSampleGapMs = 2001;
    } else if (variant === 'ownership-gap') {
      f.summary.detector.ownershipLossCount = 1;
    } else if (variant === 'final-sample-unproved') {
      f.summary.detector.finalSampleSucceeded = false;
    } else if (variant === 'sample-time-mismatch') {
      f.summary.detector.lastSampleAtUtc = '2026-01-01T00:00:04.500Z';
    } else if (variant === 'sample-after-emission') {
      f.events[5].sampledAtUtc = '2026-01-01T00:00:05.001Z';
      f.summary.detector.lastSampleAtUtc = f.events[5].sampledAtUtc;
    } else if (variant === 'truncated-state') {
      f.events[2].state.truncated = true;
    } else if (variant === 'missing-decision-boundary') {
      f.events.splice(4, 1);
      f.events.forEach((event, index) => {
        event.sequence = index + 1;
      });
      f.summary.detector.timelineRecordCount = f.events.length;
    } else if (variant === 'inconsistent-console-count') {
      f.summary.console.recordedCount = 0;
    } else if (variant === 'contradictory-unavailable-sample') {
      f.events.splice(3, 0, {
        ...f.events[2],
        timestampUtc: '2026-01-01T00:00:03.200Z',
        outcome: 'unavailable',
        reason: 'cdp-timeout',
      });
      f.events.forEach((event, index) => {
        event.sequence = index + 1;
      });
      f.summary.detector.timelineRecordCount = f.events.length;
    } else if (variant === 'invalid-candidate') {
      f.events[5].state = { ...f.state, candidates: [{ ...f.state.candidates[0], reasonCodes: ['synthetic-private-reason'] }] };
    }
    f.writeDetector();
    if (variant === 'missing-summary') {
      fs.unlinkSync(path.join(f.root, `${phase}-diagnostic-summary.json`));
    } else if (variant === 'truncated-timeline') {
      f.write('detector-timeline.jsonl', f.events.map((event) => JSON.stringify(event)).join('\n'));
    }
    const records = collectDetectorDiagnostics(f.root, [phase], invocation, true, identity);
    assert.notEqual(records[0].availability, 'available', variant);
    assert.doesNotMatch(JSON.stringify(records), /synthetic-private/);
  }
});

test('reports detector phases with no evidence as unavailable rather than unattempted', (t) => {
  const f = fixture(t);
  const [record] = collectDetectorDiagnostics(f.root, [phase], invocation, true, identity);
  assert.equal(record.reason, 'no-phase-evidence');
  assert.equal(record.attempted, 'unknown');
  assert.deepEqual(collectDetectorDiagnostics(f.root, [phase], invocation, false), []);
  assert.throws(() => collectDetectorDiagnostics(f.root, ['../other'], invocation, true), /Unregistered/);
});

test('publishes the sanitized aggregate for failed or passing runs without overwriting existing evidence', (t) => {
  const f = fixture(t);
  f.writeAll();
  fs.writeFileSync(path.join(f.root, 'invocation.json'), JSON.stringify({ schemaVersion: 1, invocation, identity }));

  const output = publishProductDiagnostics(f.root, [phase], true, identity);
  assert.equal(path.basename(output), 'regeneration-diagnostics.jsonl');
  assert.doesNotMatch(fs.readFileSync(output, 'utf8'), /synthetic-private/);
  assert.equal(publishProductDiagnostics(f.root, [phase], true, identity), output);
  assert.equal(publishProductDiagnostics(f.root, [phase], false, identity), undefined);

  fs.writeFileSync(output, 'synthetic-private-existing-value');
  assert.throws(
    () => publishProductDiagnostics(f.root, [phase], true, identity),
    (error) => /Cannot safely publish/.test(error.message) && !error.message.includes('synthetic-private-existing-value')
  );
});

test('stages only an unchanged sanitized aggregate and refuses missing or tampered evidence', (t) => {
  const f = detectorFixture(t);
  f.writeAll();
  f.writeDetector();
  fs.writeFileSync(path.join(f.root, 'invocation.json'), JSON.stringify({ schemaVersion: 1, invocation, identity }));
  const staged = path.join(f.root, 'staged.jsonl');
  assert.throws(() => stageDiagnosticAggregate(f.root, staged, [phase], identity), /missing/);
  publishProductDiagnostics(f.root, [phase], true, identity);
  stageDiagnosticAggregate(f.root, staged, [phase], identity);
  assert.doesNotMatch(fs.readFileSync(staged, 'utf8'), /synthetic-private/);
  assert.throws(() => stageDiagnosticAggregate(f.root, staged, [phase], identity), /safely stage/);
  fs.appendFileSync(path.join(f.root, 'regeneration-diagnostics.jsonl'), '{"synthetic-private":"raw content"}\n');
  const tampered = path.join(f.root, 'tampered.jsonl');
  assert.throws(() => stageDiagnosticAggregate(f.root, tampered, [phase], identity), /sanitized projection/);
  assert.equal(fs.existsSync(tampered), false);
});

test('binds publication and arming to the current source, job attempt and ordered-evidence invocation', (t) => {
  const f = fixture(t);
  const currentEnv = {
    BUILD_SOURCEVERSION: 'a'.repeat(40),
    BUILD_BUILDID: '42',
    SYSTEM_JOBID: '44444444-4444-4444-8444-444444444444',
    SYSTEM_JOBATTEMPT: '2',
    LA_E2E_CLI_EVIDENCE_INVOCATION: evidenceInvocation,
  };
  const current = regenerationDiagnosticIdentity(currentEnv);
  f.arming.identityBinding = createHmac('sha256', armId)
    .update(JSON.stringify(Object.entries(current).sort(([a], [b]) => a.localeCompare(b))))
    .digest('hex');
  f.writeAll();
  fs.writeFileSync(path.join(f.root, 'invocation.json'), JSON.stringify({ schemaVersion: 1, invocation, identity: current }));
  publishProductDiagnostics(f.root, [phase], true, current);
  stageDiagnosticAggregate(f.root, path.join(f.root, 'current.jsonl'), [phase], current);

  for (const [field, value] of [
    ['source', 'b'.repeat(40)],
    ['run', '43'],
    ['job', '55555555-5555-4555-8555-555555555555'],
    ['attempt', '3'],
    ['platform', current.platform === 'win32' ? 'linux' : 'win32'],
    ['evidenceInvocation', 'workspaceArtifactRegeneration-66666666-6666-4666-8666-666666666666'],
  ]) {
    const destination = path.join(f.root, `stale-${field}.jsonl`);
    assert.throws(() => stageDiagnosticAggregate(f.root, destination, [phase], { ...current, [field]: value }), /current job/);
    assert.equal(fs.existsSync(destination), false);
  }
  for (const binding of [undefined, 'f'.repeat(64)]) {
    f.arming.identityBinding = binding;
    f.write('product-arming.json', JSON.stringify(f.arming));
    const [capture] = collectProductDiagnostics(f.root, [phase], invocation, true, current);
    assert.equal(capture.availability, 'unavailable');
    assert.equal(capture.reason, 'arming-invalid-binding');
  }
  assert.throws(() => regenerationDiagnosticIdentity({ ...currentEnv, SYSTEM_JOBATTEMPT: '' }), /identity/);
  assert.throws(() => regenerationDiagnosticIdentity({ ...currentEnv, LA_E2E_CLI_EVIDENCE_INVOCATION: '' }), /invocation/);
});

test('stages the receipt-bound trace prefix despite a late producer append, but rejects prefix changes', (t) => {
  const f = fixture(t);
  f.writeAll();
  fs.writeFileSync(path.join(f.root, 'invocation.json'), JSON.stringify({ schemaVersion: 1, invocation, identity }));
  const output = publishProductDiagnostics(f.root, [phase], true, identity);
  const original = fs.readFileSync(output, 'utf8');
  f.write(
    'product-events.jsonl',
    `${f.productEvents.map((value) => JSON.stringify(value)).join('\n')}\n${JSON.stringify(
      f.event(5, '2026-01-01T00:00:06.000Z', 'heartbeat')
    )}\n`
  );
  assert.equal(publishProductDiagnostics(f.root, [phase], true, identity), output);
  const staged = path.join(f.root, 'appended.jsonl');
  stageDiagnosticAggregate(f.root, staged, [phase], identity);
  assert.equal(fs.readFileSync(staged, 'utf8'), original);
  assert.equal(JSON.parse(original.split('\n').find((line) => line.includes('"type":"product-capture"'))).eventCount, 4);

  const trace = path.join(f.root, `${phase}-product-events.jsonl`);
  const bytes = fs.readFileSync(trace);
  bytes[10] ^= 1;
  fs.writeFileSync(trace, bytes);
  const tampered = path.join(f.root, 'changed-prefix.jsonl');
  assert.throws(() => stageDiagnosticAggregate(f.root, tampered, [phase], identity), /sanitized projection/);
  assert.equal(fs.existsSync(tampered), false);
  fs.writeFileSync(trace, bytes.subarray(0, f.collection.traceByteLength - 1));
  assert.equal(collectProductDiagnostics(f.root, [phase], invocation, true, identity)[0].reason, 'trace-truncated');
});

test('classifies observations against the original deadline using the actual sample time', (t) => {
  const f = detectorFixture(t);
  f.productEvents.splice(
    3,
    0,
    f.event(4, '2026-01-01T00:02:00.010Z', 'warning-call-entered', { kind: 'initialization', warningId: 1, checkId: 1 })
  );
  f.productEvents[4].sequence = 5;
  f.productEvents[4].timestampUtc = '2026-01-01T00:02:00.100Z';
  f.collection.recordCount = 5;
  f.collection.lastSequence = 5;
  f.collection.decisionAtUtc = '2026-01-01T00:02:00.030Z';
  f.collection.lastEventAtUtc = f.productEvents[4].timestampUtc;
  f.collection.lastHeartbeatAtUtc = f.productEvents[4].timestampUtc;
  f.writeAll();
  f.summary.decisionAtUtc = '2026-01-01T00:02:00.030Z';
  f.summary.acceptanceCutoffUtc = f.summary.acceptanceDeadlineUtc;
  f.events[1].timestampUtc = '2026-01-01T00:01:59.800Z';
  f.events[2].timestampUtc = '2026-01-01T00:02:00.010Z';
  f.events[2].sampledAtUtc = '2026-01-01T00:01:59.900Z';
  f.events[3].timestampUtc = '2026-01-01T00:02:00.011Z';
  f.events[3].receivedAtUtc = '2026-01-01T00:02:00.009Z';
  f.events[4].timestampUtc = f.summary.decisionAtUtc;
  f.events[5].timestampUtc = '2026-01-01T00:02:00.100Z';
  f.events[5].sampledAtUtc = f.events[5].timestampUtc;
  f.events[6].timestampUtc = '2026-01-01T00:02:00.200Z';
  f.summary.detector.attachAtUtc = f.events[2].sampledAtUtc;
  f.summary.detector.firstSampleAtUtc = f.events[2].sampledAtUtc;
  f.summary.detector.lastSampleAtUtc = f.events[5].sampledAtUtc;
  f.summary.notificationSampledAtUtc = f.events[5].sampledAtUtc;
  f.writeDetector();

  const product = collectProductDiagnostics(f.root, [phase], invocation, true, identity);
  const warning = product.find((event) => event.event === 'warning-call-entered');
  assert.equal(warning.acceptanceTiming, 'at-or-after-cutoff');
  assert.equal(warning.timingBasis, 'event');
  const detector = collectDetectorDiagnostics(f.root, [phase], invocation, true, identity);
  const samples = detector.filter((event) => event.event === 'detector-poll');
  assert.equal(samples[0].acceptanceTiming, 'before-cutoff');
  assert.equal(samples[0].timingBasis, 'sampled');
  assert.equal(samples[1].acceptanceTiming, 'at-or-after-cutoff');
  assert.equal(detector[0].summary.notificationTiming.acceptanceTiming, 'at-or-after-cutoff');
  f.summary.acceptanceCutoffUtc = f.summary.decisionAtUtc;
  f.writeDetector();
  assert.equal(
    collectProductDiagnostics(f.root, [phase], invocation, true, identity).find((event) => event.event === 'warning-call-entered')
      .acceptanceTiming,
    'unknown'
  );
});

test('withholds timing and coverage when phase or decision receipts disagree', (t) => {
  const setupLateDecision = (f) => {
    const origin = Date.parse('2026-01-01T00:00:00.000Z');
    const timestamp = (seconds) => new Date(origin + seconds * 1000).toISOString();
    const productEvents = [f.event(1, timestamp(1), 'recorder-armed'), f.event(2, timestamp(1.1), 'activation-start')];
    for (let seconds = 3; seconds <= 119; seconds += 4) {
      productEvents.push(f.event(productEvents.length + 1, timestamp(seconds), 'heartbeat'));
    }
    productEvents.push(
      f.event(productEvents.length + 1, timestamp(121), 'warning-call-entered', {
        kind: 'initialization',
        warningId: 1,
        checkId: 1,
      })
    );
    productEvents.push(f.event(productEvents.length + 1, timestamp(122), 'heartbeat'));
    f.productEvents.splice(0, f.productEvents.length, ...productEvents);
    f.collection.recordCount = productEvents.length;
    f.collection.lastSequence = productEvents.length;
    f.collection.heartbeatCount = productEvents.filter((event) => event.event === 'heartbeat').length;
    f.collection.decisionAtUtc = timestamp(121.5);
    f.collection.lastEventAtUtc = timestamp(122);
    f.collection.lastHeartbeatAtUtc = timestamp(122);
    f.summary.decisionAtUtc = f.collection.decisionAtUtc;
    f.summary.acceptanceCutoffUtc = f.summary.acceptanceDeadlineUtc;
    f.events[0].timestampUtc = timestamp(0.2);
    f.events[1].timestampUtc = timestamp(119.8);
    f.events[2].timestampUtc = timestamp(119.9);
    f.events[2].sampledAtUtc = timestamp(119.9);
    f.events[3].timestampUtc = timestamp(120.3);
    f.events[3].receivedAtUtc = timestamp(120.2);
    f.events[4].timestampUtc = timestamp(121.5);
    f.events[5].timestampUtc = timestamp(121.8);
    f.events[5].sampledAtUtc = timestamp(121.8);
    f.events[6].timestampUtc = timestamp(122);
    f.summary.detector.attachAtUtc = f.events[2].sampledAtUtc;
    f.summary.detector.firstSampleAtUtc = f.events[2].sampledAtUtc;
    f.summary.detector.lastSampleAtUtc = f.events[5].sampledAtUtc;
    f.summary.detector.maxSampleGapMs = 1900;
    f.summary.notificationSampledAtUtc = f.events[5].sampledAtUtc;
  };
  const control = detectorFixture(t);
  setupLateDecision(control);
  control.writeDetector();
  assert.equal(collectDetectorDiagnostics(control.root, [phase], invocation, true, identity)[0].availability, 'available');
  const productControl = collectProductDiagnostics(control.root, [phase], invocation, true, identity);
  assert.equal(productControl[0].availability, 'available');
  assert.equal(productControl.find((event) => event.event === 'warning-call-entered').acceptanceTiming, 'at-or-after-cutoff');

  for (const variant of [
    'shifted-summary-start',
    'shifted-start-receipt',
    'arming-before-claimed-start',
    'missing-start-receipt',
    'duplicate-start-receipt',
    'missing-decision-boundary',
    'decision-boundary-mismatch',
    'product-decision-mismatch',
    'missing-product-receipt',
    'unbound-product-receipt',
    'wrong-arming-binding',
    'truncated-timeline',
  ]) {
    const f = detectorFixture(t);
    setupLateDecision(f);
    if (variant === 'shifted-summary-start') {
      f.summary.phaseStartedAtUtc = '2026-01-01T00:00:02.000Z';
      f.summary.acceptanceDeadlineUtc = '2026-01-01T00:02:02.000Z';
      f.summary.acceptanceCutoffUtc = f.summary.decisionAtUtc;
    } else if (variant === 'shifted-start-receipt') {
      f.events[0].phaseStartedAtUtc = '2025-12-31T23:59:59.000Z';
      f.events[0].acceptanceDeadlineUtc = '2026-01-01T00:01:59.000Z';
    } else if (variant === 'arming-before-claimed-start') {
      f.summary.phaseStartedAtUtc = '2026-01-01T00:00:02.000Z';
      f.summary.acceptanceDeadlineUtc = '2026-01-01T00:02:02.000Z';
      f.summary.acceptanceCutoffUtc = f.summary.decisionAtUtc;
      f.events[0].phaseStartedAtUtc = f.summary.phaseStartedAtUtc;
      f.events[0].acceptanceDeadlineUtc = f.summary.acceptanceDeadlineUtc;
      f.events[0].timestampUtc = '2026-01-01T00:00:02.200Z';
    } else if (variant === 'missing-start-receipt') {
      delete f.events[0].phaseStartedAtUtc;
    } else if (variant === 'duplicate-start-receipt') {
      f.events.splice(1, 0, { ...f.events[0] });
      f.events.forEach((event, index) => {
        event.sequence = index + 1;
      });
      f.summary.detector.timelineRecordCount = f.events.length;
    } else if (variant === 'missing-decision-boundary') {
      f.events[4].event = 'spawn-observed';
    } else if (variant === 'decision-boundary-mismatch') {
      f.events[4].timestampUtc = '2026-01-01T00:02:01.000Z';
    } else if (variant === 'product-decision-mismatch') {
      f.collection.decisionAtUtc = '2026-01-01T00:02:01.250Z';
    } else if (variant === 'unbound-product-receipt') {
      f.collection.invocation = '33333333-3333-4333-8333-333333333333';
    } else if (variant === 'wrong-arming-binding') {
      f.arming.identityBinding = 'f'.repeat(64);
    }
    f.writeDetector();
    if (variant === 'missing-product-receipt') {
      fs.unlinkSync(path.join(f.root, `${phase}-product-collection.json`));
    } else if (variant === 'truncated-timeline') {
      f.write('detector-timeline.jsonl', f.events.map((event) => JSON.stringify(event)).join('\n'));
    }

    const detector = collectDetectorDiagnostics(f.root, [phase], invocation, true, identity);
    assert.notEqual(detector[0].availability, 'available', variant);
    assert.equal(detector[0].summaryStatus, 'timing-unverified', variant);
    assert.equal(detector[0].summary.acceptanceDeadlineUtc, null, variant);
    assert.equal(detector[0].summary.notificationTiming.acceptanceTiming, 'unknown', variant);
    for (const observation of detector.slice(1)) {
      assert.equal(observation.acceptanceTiming, 'unknown', variant);
    }
    const product = collectProductDiagnostics(f.root, [phase], invocation, true, identity);
    const warning = product.find((event) => event.event === 'warning-call-entered');
    if (warning) {
      assert.equal(warning.acceptanceTiming, 'unknown', variant);
      assert.notEqual(product[0].availability, 'available', variant);
    }
  }
});

test('rejects a claimed sampling gap that the recorded sample counts make impossible', (t) => {
  const f = detectorFixture(t);
  f.events[5].timestampUtc = '2026-01-01T00:00:10.000Z';
  f.events[5].sampledAtUtc = f.events[5].timestampUtc;
  f.events[6].timestampUtc = '2026-01-01T00:00:11.000Z';
  f.summary.detector.lastSampleAtUtc = f.events[5].sampledAtUtc;
  f.summary.notificationSampledAtUtc = f.events[5].sampledAtUtc;
  f.writeDetector();
  assert.notEqual(collectDetectorDiagnostics(f.root, [phase], invocation, true, identity)[0].availability, 'available');

  f.events[5].pollCount = 5;
  f.events[5].sampleCount = 5;
  f.summary.detector.pollCount = 5;
  f.summary.detector.sampleCount = 5;
  f.writeDetector();
  assert.equal(collectDetectorDiagnostics(f.root, [phase], invocation, true, identity)[0].availability, 'available');
});

test('does not claim complete coverage when the initial detector sample is missing', (t) => {
  const f = detectorFixture(t);
  f.events[2].pollCount = 2;
  f.events[2].sampleCount = 2;
  f.events[5].pollCount = 3;
  f.events[5].sampleCount = 3;
  f.summary.detector.pollCount = 3;
  f.summary.detector.sampleCount = 3;
  f.writeDetector();
  assert.notEqual(collectDetectorDiagnostics(f.root, [phase], invocation, true, identity)[0].availability, 'available');
});

test('does not attribute a later notification state to an earlier detector sample', (t) => {
  const f = detectorFixture(t);
  f.events[2].state = { ...f.state, toastCount: 0, candidates: [] };
  f.summary.notificationSampledAtUtc = f.events[2].sampledAtUtc;
  f.writeDetector();

  const [capture] = collectDetectorDiagnostics(f.root, [phase], invocation, true, identity);
  assert.notEqual(capture.availability, 'available');
  assert.equal(capture.summaryStatus, 'timing-unverified');
  assert.equal(capture.summary.notificationTiming.acceptanceTiming, 'unknown');
});
