/* global console, module, process, require */
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const maxBytes = 1024 * 1024;
const maxAggregateBytes = 32 * 1024 * 1024;
const maxEvents = 512;
const maxProductCoverageGapMs = 5000;
const maxDetectorEvents = 1536;
const emptyEvents = new Set([
  'recorder-armed',
  'heartbeat',
  'activation-start',
  'activation-returned',
  'activation-workspace-setup-start',
  'activation-workspace-setup-returned',
  'activation-project-discovery-start',
  'activation-project-files-start',
  'activation-project-files-returned',
  'activation-vscode-check-scheduled',
  'activation-vscode-check-entered',
  'workspace-listener-registered',
  'workspace-change-entered',
  'workspace-change-returned',
  'workspace-catchup-start',
  'workspace-catchup-returned',
  'consistency-check-entered',
  'consistency-check-returned',
]);
const warningKinds = new Set(['initialization', 'outdated', 'overwrite']);
const warningResults = new Set(['yes', 'dont-warn-again', 'undefined', 'other']);
const productCollectionReasons = new Set([
  'invalid-host-binding',
  'unsafe-owned-root',
  'arming-failed',
  'arming-unavailable',
  'pre-spawn-arming-unproved',
  'trace-overflow',
  'arming-receipt-changed',
  'trace-changing',
  'trace-ownership-or-read-failed',
  'recorder-arming-missing',
  'incomplete-jsonl',
  'invalid-jsonl',
  'invalid-record',
  'binding-mismatch',
  'sequence-gap',
  'invalid-event-time',
  'coverage-gap',
  'invalid-event-code',
  'invalid-record-schema',
  'invalid-event-or-payload',
  'recorder-arming-late-or-invalid',
  'activation-start-unproved',
  'producer-write-or-overflow',
  'coverage-through-decision-unproved',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTimestamp(value) {
  return typeof value === 'string' && timestampPattern.test(value) && Number.isFinite(Date.parse(value));
}

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 1000000;
}

function readOriginalFile(file, limit = maxBytes) {
  let descriptor;
  let result;
  try {
    const before = fs.lstatSync(file);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
      result = { status: 'not-regular' };
    } else if (before.size > limit) {
      result = { status: 'too-large' };
    } else {
      descriptor = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
      const opened = fs.fstatSync(descriptor);
      if (!opened.isFile() || opened.nlink !== 1 || opened.dev !== before.dev || opened.ino !== before.ino || opened.size > limit) {
        result = { status: 'changed' };
      } else {
        const bytes = Buffer.alloc(opened.size);
        let offset = 0;
        while (offset < bytes.length) {
          const count = fs.readSync(descriptor, bytes, offset, bytes.length - offset, offset);
          if (count === 0) {
            break;
          }
          offset += count;
        }
        result =
          offset === opened.size && fs.fstatSync(descriptor).size === opened.size
            ? { status: 'ok', content: bytes.toString('utf8') }
            : { status: 'changed' };
      }
    }
  } catch (error) {
    result = { status: error && error.code === 'ENOENT' ? 'missing' : 'read-failed' };
  } finally {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {
        result = { status: 'close-failed' };
      }
    }
  }
  return result;
}

function readOriginalJson(file) {
  const input = readOriginalFile(file);
  if (input.status !== 'ok') {
    return input;
  }
  try {
    return { status: 'ok', value: JSON.parse(input.content) };
  } catch {
    return { status: 'invalid-json' };
  }
}

function projectPayload(event, value) {
  const payload = isObject(value) ? value : {};
  if (emptyEvents.has(event)) {
    return {};
  }
  switch (event) {
    case 'recorder-overflow':
      return ['event-limit', 'queue-limit'].includes(payload.reason) ? { reason: payload.reason } : undefined;
    case 'activation-workspace':
      return isCount(payload.folderCount) ? { folderCount: payload.folderCount } : undefined;
    case 'activation-project-discovery-returned':
    case 'consistency-project-discovery-returned':
      return isCount(payload.projectCount) ? { projectCount: payload.projectCount } : undefined;
    case 'workspace-catchup-decision':
      return typeof payload.needed === 'boolean' ? { needed: payload.needed } : undefined;
    case 'consistency-check-skipped':
      return ['no-workspace', 'no-projects', 'disabled'].includes(payload.reason) ? { reason: payload.reason } : undefined;
    case 'consistency-setting':
      return typeof payload.enabled === 'boolean' ? { enabled: payload.enabled } : undefined;
    case 'initialization-check':
      return ['none', 'tasks', 'launch', 'settings', 'extensions'].includes(payload.firstMissing) &&
        typeof payload.hasLanguage === 'boolean' &&
        typeof payload.hasFuncVersion === 'boolean'
        ? { firstMissing: payload.firstMissing, hasLanguage: payload.hasLanguage, hasFuncVersion: payload.hasFuncVersion }
        : undefined;
    case 'warning-call-entered':
    case 'warning-call-returned':
      return warningKinds.has(payload.kind) && isCount(payload.warningId) && payload.warningId > 0
        ? { kind: payload.kind, warningId: payload.warningId }
        : undefined;
    case 'warning-result':
      return warningKinds.has(payload.kind) && isCount(payload.warningId) && payload.warningId > 0 && warningResults.has(payload.result)
        ? { kind: payload.kind, warningId: payload.warningId, result: payload.result }
        : undefined;
    case 'warning-error':
      return warningKinds.has(payload.kind) &&
        isCount(payload.warningId) &&
        payload.warningId > 0 &&
        ['error', 'non-error'].includes(payload.errorKind)
        ? { kind: payload.kind, warningId: payload.warningId, errorKind: payload.errorKind }
        : undefined;
    default:
      return undefined;
  }
}

function projectProductEvent(value, binding) {
  if (
    !isObject(value) ||
    value.schemaVersion !== 1 ||
    value.invocation !== binding.invocation ||
    value.phase !== binding.phase ||
    value.armId !== binding.armId ||
    !isCount(value.sequence) ||
    value.sequence < 1 ||
    value.sequence > maxEvents ||
    !isTimestamp(value.timestampUtc) ||
    typeof value.event !== 'string'
  ) {
    return undefined;
  }
  const payload = projectPayload(value.event, value.payload);
  if (!payload) {
    return undefined;
  }
  return {
    schemaVersion: 1,
    type: 'product-event',
    invocation: binding.invocation,
    phase: binding.phase,
    armId: binding.armId,
    sequence: value.sequence,
    timestampUtc: value.timestampUtc,
    event: value.event,
    ...(Object.keys(payload).length ? { payload } : {}),
  };
}

function readProductArming(root, phase, invocation) {
  const input = readOriginalJson(path.join(root, `${phase}-product-arming.json`));
  if (input.status !== 'ok') {
    return { status: input.status };
  }
  const value = input.value;
  if (
    !isObject(value) ||
    value.schemaVersion !== 1 ||
    value.status !== 'armed' ||
    value.suiteId !== 'workspaceArtifactRegeneration' ||
    value.invocation !== invocation ||
    value.phase !== phase ||
    typeof value.armId !== 'string' ||
    !uuidPattern.test(value.armId) ||
    value.traceFile !== `${phase}-product-events.jsonl` ||
    !isTimestamp(value.armedAtUtc)
  ) {
    return { status: 'invalid-binding' };
  }
  return { status: 'ok', armId: value.armId, armedAtUtc: value.armedAtUtc };
}

function projectProductCollection(input, binding, armId) {
  if (input.status !== 'ok') {
    return { status: input.status };
  }
  const value = input.value;
  const times = ['armedAtUtc', 'spawnRequestedAtUtc', 'spawnObservedAtUtc', 'lastEventAtUtc', 'lastHeartbeatAtUtc'];
  const counts = ['recordCount', 'lastSequence', 'heartbeatCount'];
  if (
    !isObject(value) ||
    value.schemaVersion !== 1 ||
    value.suiteId !== 'workspaceArtifactRegeneration' ||
    value.invocation !== binding.invocation ||
    value.phase !== binding.phase ||
    (armId ? value.armId !== armId : value.armId !== null && (typeof value.armId !== 'string' || !uuidPattern.test(value.armId))) ||
    !['available', 'partial', 'unavailable'].includes(value.availability) ||
    typeof value.coverageThroughDecision !== 'boolean' ||
    typeof value.partial !== 'boolean' ||
    !Array.isArray(value.reasonCodes) ||
    value.reasonCodes.length > productCollectionReasons.size ||
    value.reasonCodes.some((reason) => !productCollectionReasons.has(reason)) ||
    counts.some((key) => !isCount(value[key])) ||
    times.some((key) => value[key] !== null && !isTimestamp(value[key])) ||
    !isTimestamp(value.decisionAtUtc)
  ) {
    return { status: 'invalid-schema' };
  }
  return {
    status: 'ok',
    availability: value.availability,
    coverageThroughDecision: value.coverageThroughDecision,
    partial: value.partial,
    reasonCodes: value.reasonCodes,
    ...Object.fromEntries(counts.map((key) => [key, value[key]])),
    ...Object.fromEntries(times.map((key) => [key, value[key]])),
    decisionAtUtc: value.decisionAtUtc,
  };
}

function collectProductPhase(root, phase, invocation) {
  const arming = readProductArming(root, phase, invocation);
  const receipt = readOriginalJson(path.join(root, `${phase}-product-collection.json`));
  const collection = projectProductCollection(receipt, { invocation, phase }, arming.armId);
  const capture = { schemaVersion: 1, type: 'product-capture', invocation, phase, availability: 'unavailable', collection };
  if (arming.status !== 'ok') {
    return [{ ...capture, reason: `arming-${arming.status}` }];
  }
  capture.armId = arming.armId;
  const trace = readOriginalFile(path.join(root, `${phase}-product-events.jsonl`));
  if (trace.status !== 'ok') {
    return [{ ...capture, reason: `trace-${trace.status}` }];
  }

  const binding = { invocation, phase, armId: arming.armId };
  const events = [];
  let valid = true;
  const lines = trace.content.split(/\r?\n/);
  if (lines.pop() !== '' || lines.some((line) => !line)) {
    valid = false;
  }
  if (lines.length > maxEvents) {
    valid = false;
  }
  for (const [index, line] of lines.slice(0, maxEvents).entries()) {
    let value;
    try {
      value = JSON.parse(line);
    } catch {
      valid = false;
      continue;
    }
    const event = projectProductEvent(value, binding);
    if (!event || event.sequence !== index + 1) {
      valid = false;
    }
    if (event) {
      events.push(event);
    }
  }
  const first = events[0];
  if (
    !first ||
    first.sequence !== 1 ||
    first.event !== 'recorder-armed' ||
    Date.parse(first.timestampUtc) < Date.parse(arming.armedAtUtc) ||
    !events.some((event) => event.event === 'activation-start') ||
    events.some((event) => event.event === 'recorder-overflow')
  ) {
    valid = false;
  }
  for (let index = 1; index < events.length; index += 1) {
    if (Date.parse(events[index].timestampUtc) < Date.parse(events[index - 1].timestampUtc)) {
      valid = false;
    }
  }
  if (events.some((event) => Date.parse(event.timestampUtc) > Date.now() + 1000)) {
    valid = false;
  }

  const decisionAtUtc = collection.status === 'ok' ? collection.decisionAtUtc : undefined;
  const decisionTime = isTimestamp(decisionAtUtc) ? Date.parse(decisionAtUtc) : undefined;
  const spawnRequestedAtUtc = collection.status === 'ok' ? collection.spawnRequestedAtUtc : undefined;
  const spawnObservedAtUtc = collection.status === 'ok' ? collection.spawnObservedAtUtc : undefined;
  const spawnRequested = isTimestamp(spawnRequestedAtUtc) ? Date.parse(spawnRequestedAtUtc) : undefined;
  const spawnObserved = isTimestamp(spawnObservedAtUtc) ? Date.parse(spawnObservedAtUtc) : undefined;
  const armedAt = Date.parse(arming.armedAtUtc);
  const collectedEvents = collection.status === 'ok' ? events.slice(0, collection.recordCount) : [];
  const collectedHeartbeats = collectedEvents.filter((event) => event.event === 'heartbeat');
  const activationEvents = collectedEvents.filter((event) => event.event === 'activation-start');
  const eventCrossesDecision =
    decisionTime !== undefined &&
    collectedEvents.some(
      (event, index) =>
        index > 0 && Date.parse(event.timestampUtc) >= decisionTime && Date.parse(collectedEvents[index - 1].timestampUtc) <= decisionTime
    );
  let lastTime = first ? Date.parse(first.timestampUtc) : undefined;
  let continuous = lastTime !== undefined && decisionTime !== undefined && lastTime <= decisionTime;
  for (const event of events.slice(1)) {
    const time = Date.parse(event.timestampUtc);
    if (lastTime === undefined || time < lastTime) {
      continuous = false;
    }
    if (decisionTime !== undefined && lastTime !== undefined && lastTime < decisionTime) {
      if (time - lastTime > maxProductCoverageGapMs) {
        continuous = false;
      }
    }
    lastTime = time;
  }
  if (
    decisionTime === undefined ||
    lastTime === undefined ||
    lastTime < decisionTime ||
    !eventCrossesDecision ||
    activationEvents.length !== 1 ||
    Date.parse(activationEvents[0].timestampUtc) > decisionTime ||
    spawnRequested === undefined ||
    spawnObserved === undefined ||
    armedAt > spawnRequested ||
    spawnRequested > spawnObserved ||
    spawnObserved > decisionTime ||
    !first ||
    Date.parse(first.timestampUtc) < spawnRequested
  ) {
    continuous = false;
  }
  const coverage =
    collection.status === 'ok' &&
    collection.availability === 'available' &&
    collection.coverageThroughDecision === true &&
    collection.partial === false &&
    collection.reasonCodes.length === 0 &&
    collection.armedAtUtc === arming.armedAtUtc &&
    collection.recordCount > 0 &&
    collection.recordCount <= events.length &&
    collection.lastSequence === collection.recordCount &&
    events[collection.recordCount - 1]?.timestampUtc === collection.lastEventAtUtc &&
    collectedHeartbeats.length === collection.heartbeatCount &&
    (collectedHeartbeats.at(-1)?.timestampUtc ?? null) === collection.lastHeartbeatAtUtc &&
    continuous;
  const status = valid && coverage ? 'available' : events.length ? 'partial' : 'unavailable';
  return [
    {
      ...capture,
      availability: status,
      reason: !valid ? 'trace-incomplete' : coverage ? 'coverage-confirmed' : 'coverage-unverified',
      eventCount: events.length,
    },
    ...events,
  ];
}

function collectProductDiagnostics(root, phaseNames, invocation, enabled) {
  if (!enabled) {
    return [];
  }
  if (typeof invocation !== 'string' || !uuidPattern.test(invocation)) {
    return [{ schemaVersion: 1, type: 'product-capture', availability: 'unavailable', reason: 'invocation-unavailable' }];
  }
  const records = [];
  for (const phase of phaseNames) {
    if (!/^(baseline|(?:vscode|root)-(?:single|multiple|repeat)(?:-reopen)?)$/.test(phase)) {
      throw new Error('Unregistered regeneration phase');
    }
    const candidates = [`${phase}-product-arming.json`, `${phase}-product-events.jsonl`, `${phase}-product-collection.json`];
    if (candidates.some((name) => fs.existsSync(path.join(root, name)))) {
      records.push(...collectProductPhase(root, phase, invocation));
    } else {
      records.push({
        schemaVersion: 1,
        type: 'product-capture',
        invocation,
        phase,
        availability: 'unavailable',
        reason: 'no-phase-evidence',
        attempted: 'unknown',
      });
    }
  }
  return records;
}

const detectorBoundaryEvents = new Set([
  'phase-start',
  'arm-ready',
  'arm-unavailable',
  'spawn-requested',
  'spawn-observed',
  'attach-start',
  'attach-owned',
  'decision',
  'teardown-start',
]);
const candidateCategories = new Set(['initialization', 'overwrite', 'other-project', 'other']);
const candidateKinds = new Set(['quickInput', 'dialog', 'notification']);
const candidateReasons = new Set([
  'wrong-project',
  'hidden',
  'out-of-viewport',
  'inactive',
  'missing-yes',
  'yes-not-visible',
  'disabled-yes',
  'aria-disabled-yes',
  'obstructed-yes',
  'duplicate-candidate',
  'workbench-not-owned',
  'document-changed',
  'candidate-observed',
]);
const screenshotReasons = new Set([
  'not-attempted',
  'no-owned-target',
  'observation-succeeded',
  'captured',
  'captured-metadata-incomplete',
  'capture-unavailable',
  'capture-failed',
  'diagnostic-collection-failed',
  'diagnostic-budget-exhausted',
  'uncertain-input',
  'current-state-unavailable',
  'workbench-not-active',
  'document-changed',
  'blocking-or-ambiguous-ui',
  'notification-center-reveal-failed',
  'diagnostic-budget-or-input-uncertain',
]);

function projectDetectorState(value) {
  const booleanKeys = [
    'shellOwned',
    'documentChanged',
    'documentVisible',
    'documentFocused',
    'centerMounted',
    'centerVisible',
    'blockingUiVisible',
    'truncated',
  ];
  const countKeys = ['toastCount', 'retainedCount'];
  if (
    !isObject(value) ||
    booleanKeys.some((key) => typeof value[key] !== 'boolean') ||
    countKeys.some((key) => !isCount(value[key])) ||
    !['on', 'off', 'unknown'].includes(value.dnd) ||
    !Array.isArray(value.candidates) ||
    value.candidates.length > 16
  ) {
    return undefined;
  }
  const candidates = [];
  for (const candidate of value.candidates) {
    if (
      !isObject(candidate) ||
      !candidateCategories.has(candidate.category) ||
      !candidateKinds.has(candidate.kind) ||
      !isCount(candidate.yesCount) ||
      !Array.isArray(candidate.reasonCodes) ||
      candidate.reasonCodes.length > candidateReasons.size ||
      candidate.reasonCodes.some((reason) => !candidateReasons.has(reason))
    ) {
      return undefined;
    }
    candidates.push({
      category: candidate.category,
      kind: candidate.kind,
      yesCount: candidate.yesCount,
      reasonCodes: candidate.reasonCodes,
    });
  }
  return {
    ...Object.fromEntries(booleanKeys.map((key) => [key, value[key]])),
    ...Object.fromEntries(countKeys.map((key) => [key, value[key]])),
    dnd: value.dnd,
    candidates,
  };
}

function projectDetectorEvent(value, binding) {
  if (
    !isObject(value) ||
    value.schemaVersion !== 1 ||
    value.invocation !== binding.invocation ||
    value.phase !== binding.phase ||
    !isCount(value.sequence) ||
    value.sequence < 1 ||
    value.sequence > maxDetectorEvents ||
    !isTimestamp(value.timestampUtc) ||
    typeof value.event !== 'string'
  ) {
    return undefined;
  }
  const event = {
    schemaVersion: 1,
    type: 'detector-event',
    invocation: binding.invocation,
    phase: binding.phase,
    sequence: value.sequence,
    timestampUtc: value.timestampUtc,
    event: value.event,
  };
  if (detectorBoundaryEvents.has(value.event)) {
    return event;
  }
  if (value.event === 'renderer-console') {
    const types = [
      'log',
      'debug',
      'info',
      'error',
      'warning',
      'assert',
      'trace',
      'dir',
      'table',
      'count',
      'timeEnd',
      'other',
      'entry',
      'exception',
    ];
    if (
      !['runtime', 'log'].includes(value.source) ||
      !types.includes(value.type) ||
      !['error', 'warning', 'info', 'debug', 'unknown'].includes(value.severity) ||
      !isTimestamp(value.receivedAtUtc)
    ) {
      return undefined;
    }
    return { ...event, source: value.source, consoleType: value.type, severity: value.severity, receivedAtUtc: value.receivedAtUtc };
  }
  if (value.event === 'detector-poll' && isCount(value.pollCount) && isCount(value.sampleCount) && typeof value.finalSample === 'boolean') {
    if (value.outcome === 'observed') {
      const state = projectDetectorState(value.state);
      return state && isTimestamp(value.sampledAtUtc)
        ? {
            ...event,
            outcome: value.outcome,
            pollCount: value.pollCount,
            sampleCount: value.sampleCount,
            sampledAtUtc: value.sampledAtUtc,
            finalSample: value.finalSample,
            state,
          }
        : undefined;
    }
    if (
      value.outcome === 'unavailable' &&
      ['cdp-timeout', 'cdp-observation-failed', 'document-changed', 'workspace-root-unproved', 'workbench-not-owned'].includes(
        value.reason
      ) &&
      (value.sampledAtUtc === null || isTimestamp(value.sampledAtUtc)) &&
      (value.attemptedAtUtc === undefined || isTimestamp(value.attemptedAtUtc))
    ) {
      return {
        ...event,
        outcome: value.outcome,
        pollCount: value.pollCount,
        sampleCount: value.sampleCount,
        sampledAtUtc: value.sampledAtUtc,
        finalSample: value.finalSample,
        reason: value.reason,
        ...(value.attemptedAtUtc ? { attemptedAtUtc: value.attemptedAtUtc } : {}),
      };
    }
  }
  return undefined;
}

function projectCaptureStatus(value) {
  if (
    !isObject(value) ||
    !['captured', 'skipped', 'unavailable'].includes(value.status) ||
    !screenshotReasons.has(value.reason) ||
    typeof value.postDeadline !== 'boolean' ||
    !['registered', 'not-configured', 'unavailable'].includes(value.registration)
  ) {
    return undefined;
  }
  return { status: value.status, reason: value.reason, postDeadline: value.postDeadline, registration: value.registration };
}

function projectDetectorSummary(value, binding) {
  if (
    !isObject(value) ||
    value.schemaVersion !== 1 ||
    value.suiteId !== 'workspaceArtifactRegeneration' ||
    value.invocation !== binding.invocation ||
    value.phase !== binding.phase ||
    value.attachmentScope !== 'owned-regular-workbench' ||
    !isTimestamp(value.decisionAtUtc) ||
    !isObject(value.detector) ||
    !isObject(value.console) ||
    !isObject(value.screenshots) ||
    !isObject(value.input)
  ) {
    return undefined;
  }
  const detector = value.detector;
  const consoleSummary = value.console;
  const detectorCounts = [
    'pollCount',
    'sampleCount',
    'sampleErrorCount',
    'ownershipLossCount',
    'maxSampleGapMs',
    'timelineRecordCount',
    'droppedCount',
  ];
  const consoleCounts = ['eventCount', 'recordedCount', 'droppedCount', 'preOwnedDiscardedCount', 'listenerFailureCount'];
  const times = ['attachAtUtc', 'firstSampleAtUtc', 'lastSampleAtUtc'];
  const beforeTeardown = projectCaptureStatus(value.screenshots.beforeTeardown);
  const notificationCenter = projectCaptureStatus(value.screenshots.notificationCenter);
  const notification = value.notification === null ? null : projectDetectorState(value.notification);
  if (
    !['available', 'partial', 'unavailable'].includes(detector.availability) ||
    typeof detector.decisionCovered !== 'boolean' ||
    detector.samplingIsDiscrete !== true ||
    detector.preAttachUnobserved !== true ||
    typeof detector.writeFailed !== 'boolean' ||
    typeof detector.finalSampleSucceeded !== 'boolean' ||
    detectorCounts.some((key) => !isCount(detector[key])) ||
    times.some((key) => detector[key] !== null && !isTimestamp(detector[key])) ||
    !['partial', 'unavailable'].includes(consoleSummary.availability) ||
    consoleSummary.scope !== 'renderer-only' ||
    consoleSummary.preAttachUnobserved !== true ||
    !['not-attempted', 'registered', 'failed'].includes(consoleSummary.listenerRegistration) ||
    !['enabled', 'pending', 'unavailable'].includes(consoleSummary.logDomain) ||
    consoleCounts.some((key) => !isCount(consoleSummary[key])) ||
    !beforeTeardown ||
    !notificationCenter ||
    notification === undefined ||
    typeof value.input.uncertain !== 'boolean' ||
    typeof value.input.pending !== 'boolean'
  ) {
    return undefined;
  }
  return {
    decisionAtUtc: value.decisionAtUtc,
    attachmentScope: value.attachmentScope,
    detector: {
      availability: detector.availability,
      decisionCovered: detector.decisionCovered,
      preAttachUnobserved: true,
      sampledOnly: true,
      finalSampleSucceeded: detector.finalSampleSucceeded,
      ...Object.fromEntries(times.map((key) => [key, detector[key]])),
      ...Object.fromEntries(detectorCounts.map((key) => [key, detector[key]])),
      writeFailed: detector.writeFailed,
    },
    console: {
      availability: consoleSummary.availability,
      scope: 'renderer-only',
      preAttachUnobserved: true,
      listenerRegistration: consoleSummary.listenerRegistration,
      ...Object.fromEntries(consoleCounts.map((key) => [key, consoleSummary[key]])),
      logDomain: consoleSummary.logDomain,
    },
    notification,
    screenshots: { beforeTeardown, notificationCenter },
    input: { uncertain: value.input.uncertain, pending: value.input.pending },
  };
}

function collectDetectorPhase(root, phase, invocation) {
  const binding = { invocation, phase };
  const trace = readOriginalFile(path.join(root, `${phase}-detector-timeline.jsonl`));
  const summaryInput = readOriginalJson(path.join(root, `${phase}-diagnostic-summary.json`));
  const summary = summaryInput.status === 'ok' ? projectDetectorSummary(summaryInput.value, binding) : undefined;
  const events = [];
  let valid = trace.status === 'ok';
  if (valid) {
    const lines = trace.content.split(/\r?\n/);
    if (lines.pop() !== '' || lines.some((line) => !line) || lines.length > maxDetectorEvents) {
      valid = false;
    }
    for (const [index, line] of lines.slice(0, maxDetectorEvents).entries()) {
      let value;
      try {
        value = JSON.parse(line);
      } catch {
        valid = false;
        continue;
      }
      const event = projectDetectorEvent(value, binding);
      if (!event || event.sequence !== index + 1) {
        valid = false;
      }
      if (event) {
        events.push(event);
      }
    }
  }
  const samples = events.filter((event) => event.event === 'detector-poll' && event.outcome === 'observed');
  const decision = summary ? Date.parse(summary.decisionAtUtc) : undefined;
  const last = samples.at(-1);
  const first = samples[0];
  const phaseStart = events.find((event) => event.event === 'phase-start');
  const attachment = events.find((event) => event.event === 'attach-owned');
  const decisionBoundary = events.find((event) => event.event === 'decision');
  if (
    events.some((event, index) => index > 0 && Date.parse(event.timestampUtc) < Date.parse(events[index - 1].timestampUtc)) ||
    samples.some(
      (event, index) =>
        !event.state.shellOwned ||
        event.state.documentChanged ||
        Date.parse(event.sampledAtUtc) > Date.parse(event.timestampUtc) ||
        (index > 0 &&
          (Date.parse(event.sampledAtUtc) < Date.parse(samples[index - 1].sampledAtUtc) ||
            event.sampleCount <= samples[index - 1].sampleCount ||
            event.pollCount <= samples[index - 1].pollCount))
    ) ||
    (summary &&
      (events.filter((event) => event.event === 'renderer-console').length !== summary.console.recordedCount ||
        summary.console.eventCount !== summary.console.recordedCount + summary.console.droppedCount))
  ) {
    valid = false;
  }
  const covered =
    valid &&
    summary?.detector.availability === 'available' &&
    summary.detector.decisionCovered &&
    summary.detector.timelineRecordCount === events.length &&
    summary.detector.droppedCount === 0 &&
    !summary.detector.writeFailed &&
    summary.detector.sampleErrorCount === 0 &&
    summary.detector.ownershipLossCount === 0 &&
    summary.detector.finalSampleSucceeded &&
    !events.some((event) => event.event === 'detector-poll' && event.outcome === 'unavailable') &&
    !samples.some((event) => event.state.truncated) &&
    summary.detector.maxSampleGapMs <= 2000 &&
    decision !== undefined &&
    first &&
    last &&
    phaseStart &&
    attachment &&
    decisionBoundary &&
    phaseStart.sequence < attachment.sequence &&
    attachment.sequence < first.sequence &&
    decisionBoundary.sequence < last.sequence &&
    Date.parse(decisionBoundary.timestampUtc) >= decision &&
    Date.parse(decisionBoundary.timestampUtc) - decision <= 1000 &&
    first.sampledAtUtc === summary.detector.firstSampleAtUtc &&
    first.sampledAtUtc === summary.detector.attachAtUtc &&
    last.sampledAtUtc === summary.detector.lastSampleAtUtc &&
    last.sampleCount === summary.detector.sampleCount &&
    last.pollCount === summary.detector.pollCount &&
    last.finalSample &&
    Date.parse(first.sampledAtUtc) <= decision &&
    Date.parse(last.sampledAtUtc) >= decision;
  const capture = {
    schemaVersion: 1,
    type: 'detector-capture',
    invocation,
    phase,
    availability: covered ? 'available' : events.length || summary ? 'partial' : 'unavailable',
    reason: covered ? 'sampled-coverage-confirmed' : !valid ? 'timeline-incomplete' : 'coverage-unverified',
    eventCount: events.length,
    timelineStatus: trace.status,
    summaryStatus: summaryInput.status === 'ok' && !summary ? 'invalid-schema' : summaryInput.status,
    ...(summary ? { summary } : {}),
  };
  return [capture, ...events];
}

function collectDetectorDiagnostics(root, phaseNames, invocation, enabled) {
  if (!enabled) {
    return [];
  }
  if (typeof invocation !== 'string' || !uuidPattern.test(invocation)) {
    return [{ schemaVersion: 1, type: 'detector-capture', availability: 'unavailable', reason: 'invocation-unavailable' }];
  }
  return phaseNames.flatMap((phase) => {
    if (!/^(baseline|(?:vscode|root)-(?:single|multiple|repeat)(?:-reopen)?)$/.test(phase)) {
      throw new Error('Unregistered regeneration phase');
    }
    const candidates = [`${phase}-detector-timeline.jsonl`, `${phase}-diagnostic-summary.json`];
    return candidates.some((name) => fs.existsSync(path.join(root, name)))
      ? collectDetectorPhase(root, phase, invocation)
      : [
          {
            schemaVersion: 1,
            type: 'detector-capture',
            invocation,
            phase,
            availability: 'unavailable',
            reason: 'no-phase-evidence',
            attempted: 'unknown',
          },
        ];
  });
}

function aggregateContent(root, phaseNames) {
  const receipt = readOriginalJson(path.join(root, 'invocation.json'));
  const invocation = receipt.status === 'ok' && isObject(receipt.value) ? receipt.value.invocation : undefined;
  const records = [
    ...collectProductDiagnostics(root, phaseNames, invocation, true),
    ...collectDetectorDiagnostics(root, phaseNames, invocation, true),
  ];
  const content = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
  if (Buffer.byteLength(content) > maxAggregateBytes) {
    throw new Error('Regeneration diagnostic aggregate exceeds its publication bound');
  }
  return content;
}

function publishProductDiagnostics(root, phaseNames, enabled) {
  if (!enabled) {
    return undefined;
  }
  const content = aggregateContent(root, phaseNames);
  const destination = path.join(root, 'regeneration-diagnostics.jsonl');
  try {
    fs.writeFileSync(destination, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  } catch (error) {
    const existing = readOriginalFile(destination, maxAggregateBytes);
    if (error?.code !== 'EEXIST' || existing.status !== 'ok' || existing.content !== content) {
      throw new Error('Cannot safely publish regeneration diagnostic evidence');
    }
  }
  return destination;
}

function stageDiagnosticAggregate(root, destination, phaseNames) {
  const source = readOriginalFile(path.join(root, 'regeneration-diagnostics.jsonl'), maxAggregateBytes);
  if (source.status !== 'ok' || source.content !== aggregateContent(root, phaseNames)) {
    throw new Error('Regeneration diagnostic aggregate is missing or does not match the sanitized projection');
  }
  try {
    fs.writeFileSync(destination, source.content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  } catch {
    throw new Error('Cannot safely stage regeneration diagnostic evidence');
  }
}

if (require.main === module) {
  try {
    if (process.argv.length !== 5 || process.argv[2] !== '--stage') {
      throw new Error('Expected --stage with source and destination');
    }
    const { SUITE_REGISTRY } = require('./e2e-cli-batch');
    const phaseNames = SUITE_REGISTRY.workspaceArtifactRegeneration.expectedPhases
      .filter((name) => name !== 'workspaceArtifactRegeneration:create')
      .map((name) => name.slice('workspaceArtifactRegeneration:'.length));
    stageDiagnosticAggregate(process.argv[3], process.argv[4], phaseNames);
  } catch {
    console.error('[workspace-regeneration-diagnostics] aggregate-staging-unavailable');
    process.exitCode = 1;
  }
}

module.exports = {
  collectDetectorDiagnostics,
  collectProductDiagnostics,
  projectDetectorEvent,
  projectProductEvent,
  publishProductDiagnostics,
  readOriginalFile,
  stageDiagnosticAggregate,
};
