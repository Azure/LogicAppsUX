/* global require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  collectDetectorDiagnostics,
  collectProductDiagnostics,
  projectProductEvent,
  publishProductDiagnostics,
  stageDiagnosticAggregate,
} = require('./regeneration-diagnostic-publication');

const invocation = '11111111-1111-4111-8111-111111111111';
const armId = '22222222-2222-4222-8222-222222222222';
const phase = 'vscode-single';

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
  const writeAll = () => {
    write('product-arming.json', JSON.stringify(arming));
    write('product-events.jsonl', `${events.map((value) => JSON.stringify(value)).join('\n')}\n`);
    write('product-collection.json', JSON.stringify(collection));
  };
  return { root, arming, collection, event, events, write, writeAll };
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
    event(1, '2026-01-01T00:00:00.000Z', 'phase-start'),
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
    screenshots: { beforeTeardown: capture, notificationCenter: capture },
    input: { uncertain: false, pending: false },
    privatePath: 'synthetic-private-profile-path',
  };
  const writeDetector = () => {
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
      message: 'synthetic-private-notification',
    })
  );
  f.events[3].sequence = 4;
  f.events[4].sequence = 5;
  f.collection.recordCount = 5;
  f.collection.lastSequence = 5;
  f.writeAll();

  const records = collectProductDiagnostics(f.root, [phase], invocation, true);

  assert.equal(records[0].availability, 'available');
  assert.equal(records[0].reason, 'coverage-confirmed');
  assert.deepEqual(records[3].payload, { kind: 'initialization', warningId: 1 });
  assert.doesNotMatch(JSON.stringify(records), /synthetic-private|notification|regeneration-publication-/);
  assert.deepEqual(
    records.slice(1).map((value) => value.sequence),
    [1, 2, 3, 4, 5]
  );
});

test('keeps partial events but cannot prove absence without the collection receipt', (t) => {
  const f = fixture(t);
  f.writeAll();
  fs.unlinkSync(path.join(f.root, `${phase}-product-collection.json`));

  const records = collectProductDiagnostics(f.root, [phase], invocation, true);

  assert.equal(records[0].availability, 'partial');
  assert.equal(records[0].reason, 'coverage-unverified');
  assert.equal(records[1].event, 'recorder-armed');
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
    }
    const records = collectProductDiagnostics(f.root, [phase], invocation, true);
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
    const records = collectProductDiagnostics(f.root, [phase], invocation, true);
    assert.notEqual(records[0].availability, 'available', variant);
  }
});

test('accepts a contiguous producer event crossing the decision even without a heartbeat', (t) => {
  const f = fixture(t);
  f.events[2].event = 'consistency-check-entered';
  f.events[3].event = 'activation-returned';
  f.collection.heartbeatCount = 0;
  f.collection.lastHeartbeatAtUtc = null;
  f.writeAll();

  const [record] = collectProductDiagnostics(f.root, [phase], invocation, true);
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
  f.write('product-collection.json', JSON.stringify(f.collection));
  const [record] = collectProductDiagnostics(f.root, [phase], invocation, true);
  assert.equal(record.reason, 'arming-missing');
  assert.deepEqual(record.collection.reasonCodes, ['arming-failed']);
  assert.doesNotMatch(JSON.stringify(record), /synthetic-private/);
});

test('records unavailable phase evidence without inventing whether the phase ran', (t) => {
  const f = fixture(t);
  const records = collectProductDiagnostics(f.root, [phase, 'root-single'], invocation, true);
  assert.deepEqual(
    records.map(({ phase: entryPhase, availability, reason, attempted }) => ({ phase: entryPhase, availability, reason, attempted })),
    [
      { phase, availability: 'unavailable', reason: 'no-phase-evidence', attempted: 'unknown' },
      { phase: 'root-single', availability: 'unavailable', reason: 'no-phase-evidence', attempted: 'unknown' },
    ]
  );
  assert.deepEqual(collectProductDiagnostics(f.root, [phase], invocation, false), []);
  assert.equal(collectProductDiagnostics(f.root, [phase], 'invalid', true)[0].reason, 'invocation-unavailable');
  assert.throws(() => collectProductDiagnostics(f.root, ['../other'], invocation, true), /Unregistered/);
});

test('rejects malformed or oversized inputs and never exposes their contents', (t) => {
  const f = fixture(t);
  f.writeAll();
  f.write('product-events.jsonl', `{"secret":"synthetic-private-malformed"`);
  const malformed = collectProductDiagnostics(f.root, [phase], invocation, true);
  assert.equal(malformed[0].availability, 'unavailable');
  assert.doesNotMatch(JSON.stringify(malformed), /synthetic-private/);
  f.write('product-events.jsonl', 'a'.repeat(1024 * 1024 + 1));
  const oversized = collectProductDiagnostics(f.root, [phase], invocation, true);
  assert.equal(oversized[0].reason, 'trace-too-large');
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
      { ...base, event: 'warning-result', payload: { kind: 'initialization', warningId: 1, result: 'raw text' } },
      binding
    ),
    undefined
  );
  assert.equal(projectProductEvent({ ...base, event: 'activation-workspace', payload: { folderCount: -1 } }, binding), undefined);
  assert.equal(projectProductEvent({ ...base, event: 'unknown', payload: {} }, binding), undefined);
});

test('projects bounded detector, console, notification and screenshot evidence without raw content', (t) => {
  const f = detectorFixture(t);
  f.writeDetector();
  const records = collectDetectorDiagnostics(f.root, [phase], invocation, true);

  assert.equal(records[0].availability, 'available');
  assert.equal(records[0].reason, 'sampled-coverage-confirmed');
  assert.equal(records[0].summary.detector.preAttachUnobserved, true);
  assert.equal(records[0].summary.detector.sampledOnly, true);
  assert.equal(records[0].summary.console.scope, 'renderer-only');
  assert.equal(records[4].consoleType, 'error');
  assert.deepEqual(records[0].summary.notification.candidates[0].reasonCodes, ['missing-yes']);
  assert.doesNotMatch(JSON.stringify(records), /synthetic-private/);
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
    const records = collectDetectorDiagnostics(f.root, [phase], invocation, true);
    assert.notEqual(records[0].availability, 'available', variant);
    assert.doesNotMatch(JSON.stringify(records), /synthetic-private/);
  }
});

test('reports detector phases with no evidence as unavailable rather than unattempted', (t) => {
  const f = fixture(t);
  const [record] = collectDetectorDiagnostics(f.root, [phase], invocation, true);
  assert.equal(record.reason, 'no-phase-evidence');
  assert.equal(record.attempted, 'unknown');
  assert.deepEqual(collectDetectorDiagnostics(f.root, [phase], invocation, false), []);
  assert.throws(() => collectDetectorDiagnostics(f.root, ['../other'], invocation, true), /Unregistered/);
});

test('publishes the sanitized aggregate for failed or passing runs without overwriting existing evidence', (t) => {
  const f = fixture(t);
  f.writeAll();
  fs.writeFileSync(path.join(f.root, 'invocation.json'), JSON.stringify({ invocation }));

  const output = publishProductDiagnostics(f.root, [phase], true);
  assert.equal(path.basename(output), 'regeneration-diagnostics.jsonl');
  assert.doesNotMatch(fs.readFileSync(output, 'utf8'), /synthetic-private/);
  assert.equal(publishProductDiagnostics(f.root, [phase], true), output);
  assert.equal(publishProductDiagnostics(f.root, [phase], false), undefined);

  fs.writeFileSync(output, 'synthetic-private-existing-value');
  assert.throws(
    () => publishProductDiagnostics(f.root, [phase], true),
    (error) => /Cannot safely publish/.test(error.message) && !error.message.includes('synthetic-private-existing-value')
  );
});

test('stages only an unchanged sanitized aggregate and refuses missing or tampered evidence', (t) => {
  const f = detectorFixture(t);
  f.writeAll();
  f.writeDetector();
  fs.writeFileSync(path.join(f.root, 'invocation.json'), JSON.stringify({ invocation }));
  const staged = path.join(f.root, 'staged.jsonl');
  assert.throws(() => stageDiagnosticAggregate(f.root, staged, [phase]), /missing/);
  publishProductDiagnostics(f.root, [phase], true);
  stageDiagnosticAggregate(f.root, staged, [phase]);
  assert.doesNotMatch(fs.readFileSync(staged, 'utf8'), /synthetic-private/);
  assert.throws(() => stageDiagnosticAggregate(f.root, staged, [phase]), /safely stage/);
  fs.appendFileSync(path.join(f.root, 'regeneration-diagnostics.jsonl'), '{"synthetic-private":"raw content"}\n');
  const tampered = path.join(f.root, 'tampered.jsonl');
  assert.throws(() => stageDiagnosticAggregate(f.root, tampered, [phase]), /sanitized projection/);
  assert.equal(fs.existsSync(tampered), false);
});
