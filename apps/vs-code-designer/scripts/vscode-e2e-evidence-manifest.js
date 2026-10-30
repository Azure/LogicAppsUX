/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, process, require */
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { getSuiteDescriptor } = require('./vscode-e2e-evidence-plans');

const manifestFileName = 'suite-evidence-manifest.json';
const manifestKind = 'logicappsux.vscodeE2E.orderedEvidence';
const schemaVersion = 2;
const lockWaitBuffer = new Int32Array(new SharedArrayBuffer(4));
const terminalStatuses = new Set(['accepted', 'diagnostic', 'disabled', 'failed', 'not-reached']);
const safeIdPattern = /^[a-z0-9][a-z0-9-]{0,199}$/;

function getEvidenceManifestPath(env = process.env) {
  const evidenceDir = env.LA_E2E_CLI_EVIDENCE_DIR?.trim();
  return evidenceDir ? path.join(path.resolve(evidenceDir), manifestFileName) : undefined;
}

function initializeSuiteEvidenceManifest({ suiteId, invocation, platform = process.platform, evidenceDir, expectedPhaseIds = [] }) {
  const descriptor = getSuiteDescriptor(suiteId);
  const resolvedEvidenceDir = path.resolve(evidenceDir);
  const manifestPath = path.join(resolvedEvidenceDir, manifestFileName);
  fs.mkdirSync(resolvedEvidenceDir, { recursive: true });

  return withManifestLock(manifestPath, () => {
    const existing = readJsonIfExists(manifestPath);
    if (
      existing?.schemaVersion === schemaVersion &&
      existing.kind === manifestKind &&
      existing.suiteId === suiteId &&
      existing.invocation === invocation
    ) {
      validateEvidenceManifest(existing);
      return existing;
    }

    fs.rmSync(path.join(resolvedEvidenceDir, 'screenshots'), { recursive: true, force: true });
    fs.rmSync(path.join(resolvedEvidenceDir, 'diagnostics'), { recursive: true, force: true });
    const groups = descriptor.buildCatalog({}).map((catalogGroup) => ({
      id: requireSafeId(catalogGroup.id, 'group id'),
      title: requireBoundedText(catalogGroup.title, 'group title', 200),
      description: requireBoundedText(catalogGroup.description, 'group description', 2000),
      checkpoints: catalogGroup.steps.map((catalogStep) => ({
        id: requireSafeId(catalogStep.checkpoint, 'checkpoint id'),
        phase: requireBoundedText(catalogStep.phase, 'checkpoint phase', 200),
        action: requireBoundedText(catalogStep.action, 'checkpoint action', 2000),
        expectedProof: requireBoundedText(catalogStep.expectedProof, 'checkpoint expected proof', 3000),
        classification: requireClassification(catalogStep.expectedClassification),
        required: true,
        status: 'pending',
      })),
    }));
    assignOrdinals(groups);
    const now = new Date().toISOString();
    const manifest = {
      schemaVersion,
      kind: manifestKind,
      suiteId,
      suiteTitle: descriptor.title,
      invocation,
      platform,
      state: 'in-progress',
      revision: 1,
      planState: suiteId === 'workspaceMultiRoot' ? 'expandable' : 'complete',
      expectedPhaseIds: sanitizeStringArray(expectedPhaseIds, 100),
      createdAt: now,
      updatedAt: now,
      groups,
      attachments: [],
      finalization: {
        complete: false,
      },
    };
    validateEvidenceManifest(manifest);
    writeJsonAtomic(manifestPath, manifest);
    return manifest;
  });
}

function declareMultiRootEvidenceCheckpoints({ manifestPath, rootLabels, expectedInvocation }) {
  return mutateManifest(manifestPath, expectedInvocation, (manifest) => {
    if (manifest.suiteId !== 'workspaceMultiRoot') {
      throw new Error('Dynamic root checkpoints are only valid for workspaceMultiRoot');
    }
    if (!Array.isArray(rootLabels) || rootLabels.length === 0 || rootLabels.length > 50) {
      throw new Error('workspaceMultiRoot requires between 1 and 50 ordered roots');
    }
    const group = manifest.groups.find((candidate) => candidate.id === 'multi-root');
    if (!group) {
      throw new Error('workspaceMultiRoot manifest is missing its multi-root group');
    }
    const mapperIndex = group.checkpoints.findIndex((checkpoint) => checkpoint.id === 'workspace-multi-root-mapper');
    if (mapperIndex < 0) {
      throw new Error('workspaceMultiRoot manifest is missing its mapper checkpoint');
    }
    const existingDynamic = group.checkpoints.filter((checkpoint) => checkpoint.id.startsWith('workspace-multi-root-debug-root-'));
    const dynamic = rootLabels.map((label, index) => ({
      id: `workspace-multi-root-debug-root-${String(index + 1).padStart(2, '0')}`,
      phase: `Root ${index + 1}`,
      displayLabel: requireDisplayLabel(label, `root label ${index + 1}`),
      action: `Start the generated debug configuration for ordered root ${index + 1}.`,
      expectedProof: 'The debug toolbar and exact root-qualified configuration are active.',
      classification: 'evidence',
      required: true,
      status: 'pending',
    }));
    if (existingDynamic.length > 0) {
      const existingLabels = existingDynamic.map((checkpoint) => checkpoint.displayLabel);
      const nextLabels = dynamic.map((checkpoint) => checkpoint.displayLabel);
      if (JSON.stringify(existingLabels) !== JSON.stringify(nextLabels)) {
        throw new Error('workspaceMultiRoot dynamic plan was already declared with different ordered labels');
      }
      return manifest;
    }
    group.checkpoints.splice(mapperIndex, 0, ...dynamic);
    assignOrdinals(manifest.groups);
    manifest.planState = 'complete';
    return manifest;
  });
}

function recordScreenshotMetadata({ manifestPath, metadataPath, metadata, expectedInvocation }) {
  const checkpointId = requireSafeId(metadata.checkpoint, 'screenshot checkpoint');
  const classification = requireClassification(metadata.classification);
  const verdict = requireVerdict(metadata.verdict);
  const screenshotPath = path.join(path.dirname(metadataPath), `${path.basename(metadataPath, path.extname(metadataPath))}.png`);

  return mutateManifest(manifestPath, expectedInvocation, (manifest) => {
    const checkpoint = findCheckpoint(manifest, checkpointId);
    if (!checkpoint) {
      if (classification !== 'diagnostic') {
        throw new Error(`Evidence screenshot "${checkpointId}" is not declared in the ${manifest.suiteId} ordered plan`);
      }
      recordAttachment(manifest, {
        id: checkpointId,
        phase: metadata.phase,
        classification,
        verdict,
        reasonCodes: metadata.reasonCodes,
        metadata,
        screenshotPath,
        bundleDirectory: path.dirname(manifestPath),
      });
      return manifest;
    }
    if (checkpoint.classification !== classification) {
      throw new Error(`Checkpoint "${checkpointId}" expected ${checkpoint.classification} but capture metadata reported ${classification}`);
    }
    enforceCheckpointOrder(manifest, checkpoint);
    const status = statusFromVerdict(verdict);
    const bundleDirectory = path.dirname(manifestPath);
    const relativeDirectory = classification === 'diagnostic' ? 'diagnostics' : 'screenshots';
    const screenshotReference =
      fs.existsSync(screenshotPath) && verdict !== 'disabled' && verdict !== 'failed'
        ? copyBundleFile({
            sourcePath: screenshotPath,
            bundleDirectory,
            relativePath: `${relativeDirectory}/${checkpointId}.png`,
            maxBytes: 20 * 1024 * 1024,
          })
        : undefined;
    if ((verdict === 'accepted' || verdict === 'diagnostic') && !screenshotReference) {
      throw new Error(`Checkpoint "${checkpointId}" reported ${verdict} without a screenshot PNG`);
    }
    const publicSidecar = {
      schemaVersion: 1,
      checkpoint: checkpointId,
      phase: requireBoundedText(metadata.phase, 'screenshot phase', 200),
      classification,
      verdict,
      reasonCodes: sanitizeStringArray(metadata.reasonCodes, 20),
      ...publicCaptureSummary(metadata),
    };
    const sidecarReference = writeBundleJson({
      bundleDirectory,
      relativePath: `${relativeDirectory}/${checkpointId}.json`,
      value: publicSidecar,
    });
    checkpoint.status = status;
    checkpoint.attempts = (checkpoint.attempts ?? 0) + 1;
    checkpoint.evidence = {
      ...(screenshotReference ? { screenshot: screenshotReference } : {}),
      sidecar: sidecarReference,
    };
    checkpoint.recordedAt = new Date().toISOString();
    return manifest;
  });
}

function finalizeEvidenceManifest({ manifestPath, state, reason, expectedInvocation }) {
  if (!['complete', 'failed', 'aborted'].includes(state)) {
    throw new Error(`Unsupported evidence finalization state: ${state}`);
  }
  return mutateManifest(manifestPath, expectedInvocation, (manifest) => {
    if (state === 'complete' && manifest.planState !== 'complete') {
      throw new Error(`Cannot finalize ${manifest.suiteId}: ordered evidence plan is ${manifest.planState}`);
    }
    const pending = manifest.groups.flatMap((group) => group.checkpoints).filter((checkpoint) => checkpoint.status === 'pending');
    const incomplete = manifest.groups
      .flatMap((group) => group.checkpoints)
      .filter(
        (checkpoint) =>
          checkpoint.required &&
          !(
            checkpoint.status === 'disabled' ||
            (checkpoint.classification === 'evidence' && checkpoint.status === 'accepted') ||
            (checkpoint.classification === 'diagnostic' && checkpoint.status === 'diagnostic')
          )
      );
    if (state === 'complete' && incomplete.length > 0) {
      throw new Error(
        `Cannot finalize ${manifest.suiteId} as complete; ${incomplete.length} checkpoints were not accepted: ${incomplete
          .slice(0, 10)
          .map((checkpoint) => checkpoint.id)
          .join(', ')}`
      );
    }
    if (state !== 'complete') {
      for (const checkpoint of pending) {
        checkpoint.status = 'not-reached';
      }
    }
    manifest.state = state;
    manifest.finalization = {
      complete: true,
      state,
      planComplete: manifest.planState === 'complete',
      finalizedAt: new Date().toISOString(),
      ...(reason ? { reason: requireBoundedText(reason, 'finalization reason', 1000) } : {}),
    };
    return manifest;
  });
}

function readEvidenceManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8'));
  validateEvidenceManifest(manifest);
  return manifest;
}

function validateEvidenceManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Ordered evidence manifest must be an object');
  }
  if (manifest.schemaVersion !== schemaVersion || manifest.kind !== manifestKind) {
    throw new Error('Unsupported ordered evidence manifest schema');
  }
  requireBoundedText(manifest.suiteId, 'suite id', 100);
  requireBoundedText(manifest.suiteTitle, 'suite title', 200);
  requireBoundedText(manifest.invocation, 'invocation', 200);
  if (!['in-progress', 'complete', 'failed', 'aborted'].includes(manifest.state)) {
    throw new Error(`Invalid ordered evidence manifest state: ${manifest.state}`);
  }
  if (!Number.isInteger(manifest.revision) || manifest.revision < 1) {
    throw new Error('Ordered evidence manifest revision must be a positive integer');
  }
  if (!['complete', 'expandable'].includes(manifest.planState)) {
    throw new Error(`Invalid ordered evidence plan state: ${manifest.planState}`);
  }
  if (!Array.isArray(manifest.groups) || !Array.isArray(manifest.attachments)) {
    throw new Error('Ordered evidence manifest groups and attachments must be arrays');
  }
  const ids = new Set();
  let expectedOrdinal = 1;
  for (const group of manifest.groups) {
    requireSafeId(group.id, 'group id');
    requireBoundedText(group.title, 'group title', 200);
    requireBoundedText(group.description, 'group description', 2000);
    if (!Array.isArray(group.checkpoints)) {
      throw new Error(`Ordered evidence group "${group.id}" must contain checkpoints`);
    }
    for (const checkpoint of group.checkpoints) {
      requireSafeId(checkpoint.id, 'checkpoint id');
      if (ids.has(checkpoint.id)) {
        throw new Error(`Duplicate ordered evidence checkpoint: ${checkpoint.id}`);
      }
      ids.add(checkpoint.id);
      if (checkpoint.ordinal !== expectedOrdinal) {
        throw new Error(`Checkpoint "${checkpoint.id}" has ordinal ${checkpoint.ordinal}; expected ${expectedOrdinal}`);
      }
      expectedOrdinal++;
      requireBoundedText(checkpoint.phase, 'checkpoint phase', 200);
      requireBoundedText(checkpoint.action, 'checkpoint action', 2000);
      requireBoundedText(checkpoint.expectedProof, 'checkpoint expected proof', 3000);
      requireClassification(checkpoint.classification);
      if (typeof checkpoint.required !== 'boolean' || !['pending', ...terminalStatuses].includes(checkpoint.status)) {
        throw new Error(`Checkpoint "${checkpoint.id}" has an invalid required/status contract`);
      }
      validateEvidenceReferences(checkpoint.evidence);
    }
  }
  for (const attachment of manifest.attachments) {
    requireSafeId(attachment.id, 'attachment id');
    requireClassification(attachment.classification);
    requireVerdict(attachment.verdict);
    validateEvidenceReferences(attachment.evidence);
  }
  if (!manifest.finalization || typeof manifest.finalization.complete !== 'boolean') {
    throw new Error('Ordered evidence manifest finalization is invalid');
  }
  return manifest;
}

function validateEvidenceReferences(evidence) {
  if (evidence === undefined) {
    return;
  }
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    throw new Error('Evidence references must be an object');
  }
  for (const [role, reference] of Object.entries(evidence)) {
    if (!['screenshot', 'sidecar'].includes(role)) {
      throw new Error(`Unsupported evidence role: ${role}`);
    }
    validateFileReference(reference, role);
  }
}

function validateFileReference(reference, role) {
  if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
    throw new Error(`Evidence ${role} reference must be an object`);
  }
  const expectedExtension = role === 'screenshot' ? '.png' : '.json';
  const normalized = requireRelativeBundlePath(reference.path);
  if (path.posix.extname(normalized).toLowerCase() !== expectedExtension) {
    throw new Error(`Evidence ${role} path must end in ${expectedExtension}`);
  }
  if (!/^[a-f0-9]{64}$/.test(reference.sha256) || !Number.isInteger(reference.size) || reference.size < 0) {
    throw new Error(`Evidence ${role} reference has invalid integrity metadata`);
  }
}

function mutateManifest(manifestPath, expectedInvocation, mutate) {
  const resolvedPath = path.resolve(manifestPath);
  const invocation = requireBoundedText(expectedInvocation, 'expected invocation', 200);
  return withManifestLock(resolvedPath, () => {
    const manifest = readEvidenceManifest(resolvedPath);
    if (manifest.invocation !== invocation) {
      throw new Error(`Ordered evidence invocation changed from ${invocation} to ${manifest.invocation}`);
    }
    if (manifest.finalization.complete) {
      throw new Error(`Ordered evidence manifest is already finalized as ${manifest.finalization.state}`);
    }
    const previousRevision = manifest.revision;
    const result = mutate(manifest) ?? manifest;
    if (result.revision !== previousRevision) {
      throw new Error('Ordered evidence mutation must not modify the revision directly');
    }
    result.revision = previousRevision + 1;
    result.updatedAt = new Date().toISOString();
    validateEvidenceManifest(result);
    writeJsonAtomic(resolvedPath, result);
    return result;
  });
}

function publicCaptureSummary(metadata) {
  const numericFields = (value, names) =>
    Object.fromEntries(
      names.filter((name) => typeof value?.[name] === 'number' && Number.isFinite(value[name])).map((name) => [name, value[name]])
    );
  const counts = (value) =>
    numericFields(value, [
      'loaders',
      'documentLoaders',
      'frames',
      'canvasNodes',
      'panels',
      'selectedLayouts',
      'workbenchShellParts',
      'buttons',
      'rows',
      'discoveryRoots',
      'discoveryControls',
    ]);
  const anchors = (value) =>
    (Array.isArray(value) ? value : [])
      .filter((anchor) => ['body', 'activeTab', 'workbenchShell', 'designerCanvas', 'selectedPanelLayout'].includes(anchor?.name))
      .slice(0, 8)
      .map((anchor) => ({ name: anchor.name, bounds: numericFields(anchor.bounds, ['left', 'top', 'width', 'height']) }));
  const summary = {};
  if (metadata?.timing) {
    summary.timing = numericFields(metadata.timing, ['timeoutMs', 'elapsedMs', 'samples', 'captureAttempts']);
  }
  if (metadata?.geometry) {
    summary.geometry = {
      viewport: numericFields(metadata.geometry.viewport, ['width', 'height', 'deviceScaleFactor']),
      anchors: anchors(metadata.geometry.anchors),
    };
  }
  if (metadata?.counts) {
    summary.counts = counts(metadata.counts);
  }
  if (Array.isArray(metadata?.events)) {
    const allowedNames = [
      'diagnostic-sample',
      'readiness-wait-start',
      'readiness-sample',
      'stable-readiness',
      'readiness-unavailable',
      'capture-start',
      'capture-rpc-failed',
      'capture-end',
      'post-sample',
      'postcheck-failed',
      'accepted',
      'rejected',
    ];
    summary.events = metadata.events
      .filter((event) => allowedNames.includes(event?.name))
      .slice(-80)
      .map((event) => ({
        name: event.name,
        ...numericFields(event, ['elapsedMs', 'attempt', 'generation', 'revision', 'structuralRevision', 'ownerRevision']),
        counts: counts(event.counts),
        anchors: anchors(event.anchors),
        details: {
          ...numericFields(event.details, [
            'preCaptureGeneration',
            'postCaptureGeneration',
            'preCaptureRevision',
            'postCaptureRevision',
            'preCaptureStructuralRevision',
            'postCaptureStructuralRevision',
            'preOwnerRevision',
            'postOwnerRevision',
          ]),
          ...Object.fromEntries(
            ['ownerRevisionAccepted', 'revisionAccepted']
              .filter((name) => typeof event.details?.[name] === 'boolean')
              .map((name) => [name, event.details[name]])
          ),
        },
      }));
  }
  return summary;
}

function recordAttachment(manifest, { id, phase, classification, verdict, reasonCodes, metadata, screenshotPath, bundleDirectory }) {
  const relativeDirectory = 'diagnostics';
  const screenshotReference =
    fs.existsSync(screenshotPath) && verdict === 'diagnostic'
      ? copyBundleFile({
          sourcePath: screenshotPath,
          bundleDirectory,
          relativePath: `${relativeDirectory}/${id}.png`,
          maxBytes: 20 * 1024 * 1024,
        })
      : undefined;
  const publicSidecar = {
    schemaVersion: 1,
    checkpoint: id,
    phase: requireBoundedText(phase, 'attachment phase', 200),
    classification,
    verdict,
    reasonCodes: sanitizeStringArray(reasonCodes, 20),
    ...publicCaptureSummary(metadata),
  };
  const sidecarReference = writeBundleJson({
    bundleDirectory,
    relativePath: `${relativeDirectory}/${id}.json`,
    value: publicSidecar,
  });
  const existing = manifest.attachments.find((attachment) => attachment.id === id);
  const attachment = {
    id,
    phase: publicSidecar.phase,
    classification,
    verdict,
    reasonCodes: publicSidecar.reasonCodes,
    evidence: {
      ...(screenshotReference ? { screenshot: screenshotReference } : {}),
      sidecar: sidecarReference,
    },
    recordedAt: new Date().toISOString(),
  };
  if (existing) {
    Object.assign(existing, attachment);
  } else {
    manifest.attachments.push(attachment);
  }
}

function enforceCheckpointOrder(manifest, checkpoint) {
  if (terminalStatuses.has(checkpoint.status)) {
    return;
  }
  const earlierPending = manifest.groups
    .flatMap((group) => group.checkpoints)
    .find((candidate) => candidate.ordinal < checkpoint.ordinal && candidate.required && candidate.status === 'pending');
  if (earlierPending) {
    throw new Error(
      `Checkpoint "${checkpoint.id}" cannot be recorded before required checkpoint "${earlierPending.id}" (ordinal ${earlierPending.ordinal})`
    );
  }
}

function findCheckpoint(manifest, checkpointId) {
  return manifest.groups.flatMap((group) => group.checkpoints).find((checkpoint) => checkpoint.id === checkpointId);
}

function assignOrdinals(groups) {
  let ordinal = 0;
  for (const checkpoint of groups.flatMap((group) => group.checkpoints)) {
    checkpoint.ordinal = ++ordinal;
  }
}

function statusFromVerdict(verdict) {
  return {
    accepted: 'accepted',
    diagnostic: 'diagnostic',
    disabled: 'disabled',
    failed: 'failed',
  }[verdict];
}

function copyBundleFile({ sourcePath, bundleDirectory, relativePath, maxBytes }) {
  const source = path.resolve(sourcePath);
  const stat = fs.lstatSync(source);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) {
    throw new Error(`Evidence source file is unsafe or exceeds ${maxBytes} bytes: ${source}`);
  }
  const normalized = requireRelativeBundlePath(relativePath);
  const destination = resolveBundlePath(bundleDirectory, normalized);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return describeFile(destination, normalized);
}

function writeBundleJson({ bundleDirectory, relativePath, value }) {
  const normalized = requireRelativeBundlePath(relativePath);
  const destination = resolveBundlePath(bundleDirectory, normalized);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`);
  return describeFile(destination, normalized);
}

function describeFile(filePath, relativePath) {
  const bytes = fs.readFileSync(filePath);
  return {
    path: relativePath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size: bytes.length,
  };
}

function requireRelativeBundlePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || path.posix.isAbsolute(value)) {
    throw new Error('Evidence bundle paths must be relative POSIX paths');
  }
  const normalized = path.posix.normalize(value);
  if (normalized === '..' || normalized.startsWith('../') || normalized !== value || value.includes('\0')) {
    throw new Error(`Evidence bundle path escapes its root: ${value}`);
  }
  return normalized;
}

function resolveBundlePath(bundleDirectory, relativePath) {
  const root = path.resolve(bundleDirectory);
  const resolved = path.resolve(root, ...relativePath.split('/'));
  const relative = path.relative(root, resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Evidence bundle path escapes its root: ${relativePath}`);
  }
  return resolved;
}

function requireSafeId(value, name) {
  if (typeof value !== 'string' || !safeIdPattern.test(value)) {
    throw new Error(`${name} must match ${safeIdPattern}`);
  }
  return value;
}

function requireDisplayLabel(value, name) {
  const text = requireBoundedText(value, name, 200);
  if (text.includes('/') || text.includes('\\') || /^[a-zA-Z]:/.test(text)) {
    throw new Error(`${name} must not contain a path`);
  }
  return text;
}

function requireBoundedText(value, name, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength || /[\0\r\n]/.test(value)) {
    throw new Error(`${name} must be a single non-empty string of at most ${maxLength} characters`);
  }
  return value;
}

function requireClassification(value) {
  if (!['evidence', 'diagnostic'].includes(value)) {
    throw new Error(`Unsupported screenshot classification: ${value}`);
  }
  return value;
}

function requireVerdict(value) {
  if (!['accepted', 'diagnostic', 'disabled', 'failed'].includes(value)) {
    throw new Error(`Unsupported screenshot verdict: ${value}`);
  }
  return value;
}

function sanitizeStringArray(value, limit) {
  return Array.isArray(value)
    ? value
        .filter((entry) => typeof entry === 'string')
        .map((entry) =>
          entry
            .replace(/[\0\r\n]/g, ' ')
            .trim()
            .slice(0, 200)
        )
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return undefined;
  }
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporaryPath, filePath);
}

function withManifestLock(manifestPath, action) {
  const lockPath = `${path.resolve(manifestPath)}.lock`;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const deadline = Date.now() + 10_000;
  let descriptor;
  while (descriptor === undefined) {
    try {
      descriptor = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`);
    } catch (error) {
      if (error?.code !== 'EEXIST' || Date.now() >= deadline) {
        throw error;
      }
      Atomics.wait(lockWaitBuffer, 0, 0, 25);
    }
  }
  try {
    return action();
  } finally {
    fs.closeSync(descriptor);
    fs.rmSync(lockPath, { force: true });
  }
}

module.exports = {
  finalizeEvidenceManifest,
  getEvidenceManifestPath,
  initializeSuiteEvidenceManifest,
  declareMultiRootEvidenceCheckpoints,
  manifestFileName,
  manifestKind,
  readEvidenceManifest,
  recordScreenshotMetadata,
  schemaVersion,
  validateEvidenceManifest,
  _test: {
    requireRelativeBundlePath,
    resolveBundlePath,
  },
};
