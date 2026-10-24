#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const fs = require('node:fs');
const path = require('node:path');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const { readEvidenceManifest } = require('./vscode-e2e-evidence-manifest');

const markdownFileName = 'VS_CODE_CLI_EVIDENCE.md';
const manifestFileName = 'VS_CODE_CLI_EVIDENCE.json';
const httpMarkdownFileName = 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.md';
const httpManifestFileName = 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.json';

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }
    options[arg.slice(2)] = value;
    index++;
  }
  return options;
}

function getDefaultPaths(artifactRoot, suiteId) {
  const resultsRoot = path.join(artifactRoot, 'results');
  return {
    resultPath: path.join(resultsRoot, `${suiteId}.json`),
    terminalResultPath: path.join(resultsRoot, `${suiteId}.terminal-result.json`),
    admissionContextPath: path.join(resultsRoot, `admission-context-${suiteId}.json`),
  };
}

function generateVscodeE2eEvidenceReport(options) {
  const suiteId = requiredOption(options.suiteId, 'suiteId');
  if (!Object.hasOwn(SUITE_REGISTRY, suiteId)) {
    throw new Error(`Unknown suite-id "${suiteId}"`);
  }
  const artifactRoot = path.resolve(requiredOption(options.artifactRoot, 'artifactRoot'));
  fs.mkdirSync(artifactRoot, { recursive: true });
  const defaults = getDefaultPaths(artifactRoot, suiteId);
  const resultPath = requireArtifactLocalPath(artifactRoot, options.resultPath || defaults.resultPath, 'resultPath');
  const terminalResultPath = requireArtifactLocalPath(
    artifactRoot,
    options.terminalResultPath || defaults.terminalResultPath,
    'terminalResultPath'
  );
  const admissionContextPath = requireArtifactLocalPath(
    artifactRoot,
    options.admissionContextPath || defaults.admissionContextPath,
    'admissionContextPath'
  );
  const inputs = {
    result: readStructuredJson(resultPath),
    terminalResult: readStructuredJson(terminalResultPath),
    admissionContext: readStructuredJson(admissionContextPath),
  };
  const producerManifestPath = requireArtifactLocalPath(
    artifactRoot,
    options.evidenceManifest || path.join(artifactRoot, 'suite-evidence-manifest.json'),
    'evidenceManifest'
  );
  const producerManifest = readEvidenceManifest(producerManifestPath);
  if (producerManifest.suiteId !== suiteId) {
    throw new Error(`Ordered evidence manifest suite "${producerManifest.suiteId}" does not match requested suite "${suiteId}"`);
  }
  const groups = buildManifestEvidence({ artifactRoot, producerManifest });
  const extras = buildManifestAttachments({ artifactRoot, producerManifest });
  const summary = buildSummary(inputs, suiteId);
  const catalogNotes = [
    `Producer manifest state: ${producerManifest.state}.`,
    `Producer manifest revision: ${producerManifest.revision}.`,
    `Producer plan state: ${producerManifest.planState}.`,
  ];
  const generatedAt = new Date().toISOString();
  const manifest = {
    schemaVersion: 1,
    suiteId,
    suiteTitle: producerManifest.suiteTitle,
    mode: 'manifest',
    generatedAt,
    report: markdownFileName,
    manifest: manifestFileName,
    canonicalStepCount: groups.reduce((count, group) => count + group.steps.length, 0),
    summary,
    sourceFiles: {
      result: describeInputFile(artifactRoot, inputs.result),
      terminalResult: describeInputFile(artifactRoot, inputs.terminalResult),
      admissionContext: describeInputFile(artifactRoot, inputs.admissionContext),
      producerManifest: describeInputFile(artifactRoot, {
        status: 'available',
        path: producerManifestPath,
      }),
      screenshots: describeReferencedDirectories(artifactRoot, producerManifest),
    },
    catalogNotes,
    groups,
    diagnosticExtras: extras,
  };
  const markdown = buildMarkdown(manifest);
  const markdownPath = path.join(artifactRoot, markdownFileName);
  const manifestPath = path.join(artifactRoot, manifestFileName);
  fs.writeFileSync(markdownPath, `${markdown.trimEnd()}\n`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const aliasPaths = [];
  let compatibility;
  if (suiteId === 'httpTimeoutLifecycle') {
    const markdownAliasPath = path.join(artifactRoot, httpMarkdownFileName);
    const manifestAliasPath = path.join(artifactRoot, httpManifestFileName);
    const aliasManifest = buildHttpCompatibilityManifest(manifest, inputs);
    const aliasMarkdown = buildHttpCompatibilityMarkdown(aliasManifest);
    fs.writeFileSync(markdownAliasPath, `${aliasMarkdown.trimEnd()}\n`);
    fs.writeFileSync(manifestAliasPath, `${JSON.stringify(aliasManifest, null, 2)}\n`);
    aliasPaths.push(markdownAliasPath, manifestAliasPath);
    compatibility = {
      markdownPath: markdownAliasPath,
      manifestPath: manifestAliasPath,
      manifest: aliasManifest,
      markdown: aliasMarkdown,
    };
  }
  return { markdownPath, manifestPath, aliasPaths, compatibility, manifest, markdown };
}

function buildHttpCompatibilityManifest(manifest, inputs) {
  return {
    schemaVersion: 1,
    suiteId: manifest.suiteId,
    generatedAt: manifest.generatedAt,
    report: httpMarkdownFileName,
    canonicalStepCount: manifest.canonicalStepCount,
    summary: buildHttpCompatibilitySummary(inputs),
    sourceFiles: {
      result: manifest.sourceFiles.result,
      terminalResult: manifest.sourceFiles.terminalResult,
      admissionContext: manifest.sourceFiles.admissionContext,
      screenshots: manifest.sourceFiles.screenshots[0],
    },
    groups: manifest.groups,
    diagnosticExtras: manifest.diagnosticExtras,
  };
}

function buildHttpCompatibilitySummary(inputs) {
  const result = inputs.result.value || {};
  const terminal = inputs.terminalResult.value || {};
  const admission = inputs.admissionContext.value || {};
  const expectedPhaseIds = safeStringArray(terminal.expectedPhaseIds, 50);
  const observedPhaseIds = safeStringArray(terminal.observedPhaseIds, 50);
  const phaseResults = Array.isArray(terminal.phaseResults)
    ? terminal.phaseResults.slice(0, 50).map((phase) => ({
        phaseId: safeScalar(phase?.phaseId),
        complete: safeBoolean(phase?.complete),
        exitCode: safeInteger(phase?.exitCode),
        signal: safeNullableScalar(phase?.signal),
        cleanupVerified: safeBoolean(phase?.cleanupVerified),
        diagnosticsError: Boolean(safeScalar(phase?.diagnosticsError)),
      }))
    : [];
  return {
    identity: {
      producerDefinitionId: safeScalar(admission.producerDefinitionId),
      producerRunId: safeScalar(admission.producerRunId),
      producerBuildNumber: safeScalar(admission.producerBuildNumber),
      sourceSHA: safeScalar(admission.sourceSHA),
      checkoutRef: safeScalar(admission.checkoutRef),
      repositoryName: safeScalar(admission.repositoryName),
      repositoryUri: safeUri(admission.repositoryUri),
      artifactName: safeScalar(admission.artifactName),
      artifactSHA256: safeScalar(admission.artifactSHA256),
      resolvedVSCodeBuild: safeScalar(admission.resolvedVSCodeBuild),
    },
    testResult: {
      label: safeScalar(result.label),
      outcome: safeScalar(result.outcome),
      total: safeInteger(result.total),
      passing: safeInteger(result.passing),
      failing: safeInteger(result.failing),
      pending: safeInteger(result.pending),
      passRate: safeNumber(result.passRate),
      duration: safeScalar(result.duration),
    },
    lifecycle: {
      complete: safeBoolean(terminal.complete),
      lifecycleFinalized: safeBoolean(terminal.lifecycleFinalized),
      exitCode: safeInteger(terminal.exitCode),
      signal: safeNullableScalar(terminal.signal),
      cleanupVerified: safeBoolean(terminal.cleanupVerified),
      originalProcessClosureVerified: safeBoolean(terminal.originalProcessClosureVerified),
      processClosureProof: safeScalar(terminal.processClosureProof),
      phaseCompleteness: safeBoolean(terminal.phaseCompleteness),
      expectedPhaseIds,
      observedPhaseIds,
      exactPhaseOrder:
        expectedPhaseIds.length > 0 &&
        expectedPhaseIds.length === observedPhaseIds.length &&
        expectedPhaseIds.every((phaseId, index) => phaseId === observedPhaseIds[index]),
      missingPhaseIds: safeStringArray(terminal.missingPhaseIds, 50),
      unexpectedPhaseIds: safeStringArray(terminal.unexpectedPhaseIds, 50),
      duplicatePhaseIds: safeStringArray(terminal.duplicatePhaseIds, 50),
      blockedPhaseIds: safeStringArray(terminal.blockedPhaseIds, 50),
      phaseResults,
    },
    inputStatus: {
      result: inputs.result.status,
      terminalResult: inputs.terminalResult.status,
      admissionContext: inputs.admissionContext.status,
    },
  };
}

function requiredOption(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function requireArtifactLocalPath(artifactRoot, targetPath, name) {
  const resolvedPath = path.resolve(targetPath);
  if (artifactRelativePath(artifactRoot, resolvedPath) === undefined) {
    throw new Error(`${name} must stay inside artifactRoot`);
  }
  return resolvedPath;
}

function readStructuredJson(filePath) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    return { status: 'missing', path: resolvedPath };
  }
  try {
    const value = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { status: 'invalid', path: resolvedPath };
    }
    return { status: 'available', path: resolvedPath, value };
  } catch {
    return { status: 'invalid', path: resolvedPath };
  }
}

function buildManifestEvidence({ artifactRoot, producerManifest }) {
  return producerManifest.groups.map((group) => ({
    id: group.id,
    title: group.title,
    description: group.description,
    steps: group.checkpoints.map((checkpoint) => {
      const sidecar = checkpoint.evidence?.sidecar ? readManifestSidecar(artifactRoot, checkpoint.evidence.sidecar) : { status: 'missing' };
      return {
        number: checkpoint.ordinal,
        groupId: group.id,
        groupTitle: group.title,
        checkpoint: checkpoint.id,
        phase: checkpoint.phase,
        action: checkpoint.action,
        expectedProof: checkpoint.expectedProof,
        expectedClassification: checkpoint.classification,
        status: mapManifestStatus(checkpoint.status),
        screenshot: describeManifestReference(artifactRoot, checkpoint.evidence?.screenshot, '.png'),
        sidecar: {
          ...describeManifestReference(artifactRoot, checkpoint.evidence?.sidecar, '.json'),
          status: sidecar.status,
          classification: safeEnum(sidecar.value?.classification, ['evidence', 'diagnostic']),
          verdict: safeEnum(sidecar.value?.verdict, ['accepted', 'diagnostic', 'disabled', 'failed']),
          reasonCodes: safeStringArray(sidecar.value?.reasonCodes, 12),
          checkpoint: safeScalar(sidecar.value?.checkpoint),
          phase: safeScalar(sidecar.value?.phase),
        },
      };
    }),
  }));
}

function buildManifestAttachments({ artifactRoot, producerManifest }) {
  return producerManifest.attachments.map((attachment) => {
    const sidecar = attachment.evidence?.sidecar ? readManifestSidecar(artifactRoot, attachment.evidence.sidecar) : { status: 'missing' };
    return {
      checkpoint: attachment.id,
      status: attachment.verdict === 'diagnostic' ? 'diagnostic-extra' : mapManifestStatus(attachment.verdict),
      screenshot: describeManifestReference(artifactRoot, attachment.evidence?.screenshot, '.png'),
      sidecar: {
        ...describeManifestReference(artifactRoot, attachment.evidence?.sidecar, '.json'),
        status: sidecar.status,
        classification: safeEnum(sidecar.value?.classification, ['evidence', 'diagnostic']),
        verdict: safeEnum(sidecar.value?.verdict, ['accepted', 'diagnostic', 'disabled', 'failed']),
        reasonCodes: safeStringArray(sidecar.value?.reasonCodes, 12),
      },
    };
  });
}

function readManifestSidecar(artifactRoot, reference) {
  const file = describeManifestReference(artifactRoot, reference, '.json');
  if (file.status !== 'available') {
    return { status: file.status };
  }
  return readScreenshotSidecar(path.resolve(artifactRoot, ...reference.path.split('/')));
}

function describeManifestReference(artifactRoot, reference, expectedExtension) {
  if (!reference) {
    return { status: 'missing', candidates: [] };
  }
  const filePath = requireManifestReferencePath(artifactRoot, reference.path, expectedExtension);
  if (!fs.existsSync(filePath)) {
    return { status: 'missing', path: reference.path, candidates: [] };
  }
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    return { status: 'invalid-reference', path: reference.path, candidates: [] };
  }
  const bytes = fs.readFileSync(filePath);
  const sha256 = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== reference.size || sha256 !== reference.sha256) {
    return { status: 'integrity-mismatch', path: reference.path, candidates: [] };
  }
  return {
    status: 'available',
    path: reference.path,
    link: artifactRelativeLink(artifactRoot, filePath),
    candidates: [],
  };
}

function requireManifestReferencePath(artifactRoot, relativePath, expectedExtension) {
  if (
    typeof relativePath !== 'string' ||
    !relativePath ||
    relativePath.includes('\\') ||
    path.posix.isAbsolute(relativePath) ||
    path.posix.normalize(relativePath) !== relativePath ||
    relativePath === '..' ||
    relativePath.startsWith('../') ||
    path.posix.extname(relativePath).toLowerCase() !== expectedExtension
  ) {
    throw new Error(`Invalid ordered evidence reference: ${relativePath}`);
  }
  return requireArtifactLocalPath(artifactRoot, path.resolve(artifactRoot, ...relativePath.split('/')), 'evidence reference');
}

function describeReferencedDirectories(artifactRoot, producerManifest) {
  const directories = new Set();
  const entries = [...producerManifest.groups.flatMap((group) => group.checkpoints), ...producerManifest.attachments];
  for (const entry of entries) {
    for (const reference of Object.values(entry.evidence ?? {})) {
      directories.add(path.posix.dirname(reference.path));
    }
  }
  return [...directories]
    .sort()
    .map((relativePath) => describeDirectory(artifactRoot, path.resolve(artifactRoot, ...relativePath.split('/'))));
}

function mapManifestStatus(status) {
  return (
    {
      accepted: 'accepted',
      diagnostic: 'diagnostic',
      disabled: 'disabled',
      failed: 'rejected',
      'not-reached': 'not-reached',
      pending: 'not-reached',
    }[status] ?? 'rejected'
  );
}

function readScreenshotSidecar(sidecarPath) {
  try {
    const value = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { status: 'invalid' };
    }
    return { status: 'available', value };
  } catch {
    return { status: 'invalid' };
  }
}

function buildSummary(inputs, suiteId) {
  const result = inputs.result.value || {};
  const terminal = inputs.terminalResult.value || {};
  const admission = inputs.admissionContext.value || {};
  const phaseResults = Array.isArray(terminal.phaseResults)
    ? terminal.phaseResults.slice(0, 50).map((phase) => ({
        phaseId: safeScalar(phase?.phaseId),
        complete: safeBoolean(phase?.complete),
        exitCode: safeInteger(phase?.exitCode),
        signal: safeNullableScalar(phase?.signal),
        cleanupVerified: safeBoolean(phase?.cleanupVerified),
        diagnosticsError: Boolean(safeScalar(phase?.diagnosticsError)),
      }))
    : [];
  const directExpectedPhaseIds = safeStringArray(terminal.expectedPhaseIds, 50);
  const alternateExpectedPhaseIds = safeStringArray(terminal.expectedPhases, 50);
  const expectedPhaseIds =
    directExpectedPhaseIds.length > 0
      ? directExpectedPhaseIds
      : alternateExpectedPhaseIds.length > 0
        ? alternateExpectedPhaseIds
        : [...SUITE_REGISTRY[suiteId].expectedPhases];
  const directObservedPhaseIds = safeStringArray(terminal.observedPhaseIds, 50);
  const alternateObservedPhaseIds = safeStringArray(terminal.observedPhases, 50);
  const observedPhaseIds =
    directObservedPhaseIds.length > 0
      ? directObservedPhaseIds
      : alternateObservedPhaseIds.length > 0
        ? alternateObservedPhaseIds
        : phaseResults.map((phase) => phase.phaseId).filter(Boolean);
  return {
    identity: {
      producerDefinitionId: safeScalar(admission.producerDefinitionId),
      producerRunId: safeScalar(admission.producerRunId),
      producerBuildNumber: safeScalar(admission.producerBuildNumber),
      sourceSHA: safeScalar(admission.sourceSHA),
      checkoutRef: safeScalar(admission.checkoutRef),
      repositoryName: safeScalar(admission.repositoryName),
      repositoryUri: safeUri(admission.repositoryUri),
      artifactName: safeScalar(admission.artifactName),
      artifactSHA256: safeScalar(admission.artifactSHA256),
      resolvedVSCodeBuild: safeScalar(admission.resolvedVSCodeBuild),
    },
    testResult: {
      label: safeScalar(result.label),
      outcome: safeScalar(result.outcome),
      total: safeInteger(result.total),
      passing: safeInteger(result.passing),
      failing: safeInteger(result.failing),
      pending: safeInteger(result.pending),
      passRate: safeNumber(result.passRate),
      duration: safeScalar(result.duration),
    },
    lifecycle: {
      complete: safeBoolean(terminal.complete),
      lifecycleFinalized: safeBoolean(terminal.lifecycleFinalized),
      exitCode: safeInteger(terminal.exitCode),
      signal: safeNullableScalar(terminal.signal),
      cleanupVerified: safeBoolean(terminal.cleanupVerified),
      originalProcessClosureVerified: safeBoolean(terminal.originalProcessClosureVerified),
      processClosureProof: safeScalar(terminal.processClosureProof),
      phaseCompleteness: safeBoolean(terminal.phaseCompleteness),
      expectedPhaseIds,
      observedPhaseIds,
      exactPhaseOrder:
        expectedPhaseIds.length > 0 &&
        expectedPhaseIds.length === observedPhaseIds.length &&
        expectedPhaseIds.every((phaseId, index) => phaseId === observedPhaseIds[index]),
      missingPhaseIds: safeStringArray(terminal.missingPhaseIds, 50),
      unexpectedPhaseIds: safeStringArray(terminal.unexpectedPhaseIds, 50),
      duplicatePhaseIds: safeStringArray(terminal.duplicatePhaseIds, 50),
      blockedPhaseIds: safeStringArray(terminal.blockedPhaseIds, 50),
      phaseResults,
    },
    inputStatus: {
      result: inputs.result.status,
      terminalResult: inputs.terminalResult.status,
      admissionContext: inputs.admissionContext.status,
    },
  };
}

function safeScalar(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (!['string', 'number', 'boolean'].includes(typeof value)) {
    return undefined;
  }
  const text = [...String(value)]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 ? ' ' : character;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, 300) : undefined;
}

function safeNullableScalar(value) {
  return value === null ? null : safeScalar(value);
}

function safeUri(value) {
  const scalar = safeScalar(value);
  if (!scalar) {
    return undefined;
  }
  return scalar.split(/[?#]/, 1)[0];
}

function safeStringArray(value, limit) {
  return Array.isArray(value) ? value.map(safeScalar).filter(Boolean).slice(0, limit) : [];
}

function safeEnum(value, allowed) {
  return allowed.includes(value) ? value : undefined;
}

function safeBoolean(value) {
  return typeof value === 'boolean' ? value : undefined;
}

function safeInteger(value) {
  return Number.isInteger(value) ? value : undefined;
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : undefined;
}

function describeInputFile(artifactRoot, input) {
  return {
    status: input.status,
    path: artifactRelativePath(artifactRoot, input.path),
    link: input.status === 'available' ? artifactRelativeLink(artifactRoot, input.path) : undefined,
  };
}

function describeDirectory(artifactRoot, directoryPath) {
  const available = fs.existsSync(directoryPath);
  return {
    status: available ? 'available' : 'missing',
    path: artifactRelativePath(artifactRoot, directoryPath),
    link: available ? artifactRelativeLink(artifactRoot, directoryPath) : undefined,
  };
}

function artifactRelativePath(artifactRoot, targetPath) {
  if (!targetPath) {
    return undefined;
  }
  const relative = path.relative(path.resolve(artifactRoot), path.resolve(targetPath));
  if (!relative || relative === '.') {
    return '.';
  }
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return undefined;
  }
  return relative.split(path.sep).join('/');
}

function artifactRelativeLink(artifactRoot, targetPath) {
  const relative = artifactRelativePath(artifactRoot, targetPath);
  if (!relative) {
    return undefined;
  }
  if (relative === '.') {
    return './';
  }
  return relative
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function buildHttpCompatibilityMarkdown(manifest) {
  const canonicalSteps = manifest.groups.flatMap((group) => group.steps);
  const counts = canonicalSteps.reduce((aggregate, entry) => {
    aggregate[entry.status] = (aggregate[entry.status] || 0) + 1;
    return aggregate;
  }, {});
  const lines = [
    '# HTTP Timeout Lifecycle Evidence',
    '',
    '> This report is an explanatory correlation of staged structured results and screenshot evidence. The existing strict lifecycle acceptance remains authoritative.',
    '',
    `- **Generated:** ${markdownValue(manifest.generatedAt)}`,
    `- **Canonical checkpoints:** ${manifest.canonicalStepCount}`,
    `- **Evidence status:** ${Object.entries(counts)
      .map(([status, count]) => `${status}=${count}`)
      .join(', ')}`,
    `- **Diagnostic extras:** ${manifest.diagnosticExtras.length}`,
    `- **Machine-readable manifest:** [${httpManifestFileName}](${httpManifestFileName})`,
    '',
    '## Run summary',
    '',
    ...buildIdentitySummary(manifest.summary.identity),
    '',
    ...buildTestSummary(manifest.summary.testResult),
    '',
    ...buildLifecycleSummary(manifest.summary.lifecycle),
    '',
    '### Structured input availability',
    '',
    '| Input | Status | Artifact link |',
    '| --- | --- | --- |',
    summaryInputRow('Native result', manifest.summary.inputStatus.result, manifest.sourceFiles.result),
    summaryInputRow('Terminal result', manifest.summary.inputStatus.terminalResult, manifest.sourceFiles.terminalResult),
    summaryInputRow('Admission context', manifest.summary.inputStatus.admissionContext, manifest.sourceFiles.admissionContext),
    summaryInputRow('Screenshots', manifest.sourceFiles.screenshots.status, manifest.sourceFiles.screenshots),
    '',
    '## Ordered evidence catalog',
    '',
  ];
  for (const group of manifest.groups) {
    lines.push(`### ${escapeMarkdown(group.title)}`, '', escapeMarkdown(group.description), '');
    for (const entry of group.steps) {
      lines.push(...buildStepMarkdown(entry, humanizeHistoricalHttpCheckpoint));
    }
  }
  lines.push('## Additional diagnostic screenshots', '');
  if (manifest.diagnosticExtras.length === 0) {
    lines.push('No non-catalog screenshot or sidecar files were staged.', '');
  } else {
    lines.push(
      'These files are retained separately from the required 38 checkpoints. They can explain retries or failure transitions but cannot replace a required checkpoint.',
      ''
    );
    for (const extra of manifest.diagnosticExtras) {
      lines.push(
        `### ${escapeMarkdown(extra.checkpoint)}`,
        '',
        `- **Status:** ${statusLabel(extra.status)}`,
        `- **Screenshot:** ${fileLink(extra.screenshot, 'PNG')}`,
        `- **Semantic sidecar:** ${fileLink(extra.sidecar, 'JSON')}`,
        `- **Classification / verdict:** ${markdownValue(extra.sidecar.classification)} / ${markdownValue(extra.sidecar.verdict)}`,
        `- **Reason codes:** ${markdownList(extra.sidecar.reasonCodes)}`,
        ''
      );
    }
  }
  return lines.join('\n');
}

function buildMarkdown(manifest) {
  const canonicalSteps = manifest.groups.flatMap((group) => group.steps);
  const counts = canonicalSteps.reduce((aggregate, entry) => {
    aggregate[entry.status] = (aggregate[entry.status] || 0) + 1;
    return aggregate;
  }, {});
  const lines = [
    `# ${escapeMarkdown(manifest.suiteTitle)} Evidence`,
    '',
    '> This report is an explanatory correlation of staged structured results and allowlisted screenshot evidence. Existing test, phase, cleanup, process-closure, and terminal acceptance remains authoritative.',
    '',
    `- **Generated:** ${markdownValue(manifest.generatedAt)}`,
    `- **Suite ID:** \`${escapeInlineCode(manifest.suiteId)}\``,
    `- **Evidence source:** \`${escapeInlineCode(manifest.mode)}\``,
    `- **Canonical checkpoints:** ${manifest.canonicalStepCount}`,
    `- **Evidence status:** ${
      manifest.canonicalStepCount === 0
        ? 'summary-only'
        : Object.entries(counts)
            .map(([status, count]) => `${status}=${count}`)
            .join(', ')
    }`,
    `- **Diagnostic extras:** ${manifest.diagnosticExtras.length}`,
    `- **Machine-readable manifest:** [${manifest.manifest}](${manifest.manifest})`,
    '',
    '## Run summary',
    '',
    ...buildIdentitySummary(manifest.summary.identity),
    '',
    ...buildTestSummary(manifest.summary.testResult),
    '',
    ...buildLifecycleSummary(manifest.summary.lifecycle),
    '',
    '### Structured input availability',
    '',
    '| Input | Status | Artifact link |',
    '| --- | --- | --- |',
    summaryInputRow('Native result', manifest.summary.inputStatus.result, manifest.sourceFiles.result),
    summaryInputRow('Terminal result', manifest.summary.inputStatus.terminalResult, manifest.sourceFiles.terminalResult),
    summaryInputRow('Admission context', manifest.summary.inputStatus.admissionContext, manifest.sourceFiles.admissionContext),
    ...manifest.sourceFiles.screenshots.map((directory, index) =>
      summaryInputRow(`Screenshot directory ${index + 1}`, directory.status, directory)
    ),
    summaryInputRow('Producer evidence manifest', manifest.sourceFiles.producerManifest.status, manifest.sourceFiles.producerManifest),
    '',
  ];
  if (manifest.catalogNotes.length > 0) {
    lines.push('### Catalog notes', '', ...manifest.catalogNotes.map((note) => `- ${escapeMarkdown(note)}`), '');
  }
  lines.push('## Ordered evidence catalog', '');
  for (const group of manifest.groups) {
    lines.push(`### ${escapeMarkdown(group.title)}`, '', escapeMarkdown(group.description), '');
    for (const entry of group.steps) {
      lines.push(...buildStepMarkdown(entry));
    }
  }
  lines.push('## Additional diagnostic screenshots', '');
  if (manifest.diagnosticExtras.length === 0) {
    lines.push('No non-catalog screenshot or sidecar files were staged.', '');
  } else {
    lines.push(
      'These files are retained separately from the producer-owned ordered plan. They can explain retries or failure transitions but cannot replace a required checkpoint.',
      ''
    );
    for (const extra of manifest.diagnosticExtras) {
      lines.push(
        `### ${escapeMarkdown(extra.checkpoint)}`,
        '',
        `- **Status:** ${statusLabel(extra.status)}`,
        `- **Screenshot:** ${fileLink(extra.screenshot, 'PNG')}`,
        `- **Semantic sidecar:** ${fileLink(extra.sidecar, 'JSON')}`,
        `- **Classification / verdict:** ${markdownValue(extra.sidecar.classification)} / ${markdownValue(extra.sidecar.verdict)}`,
        `- **Reason codes:** ${markdownList(extra.sidecar.reasonCodes)}`,
        ''
      );
    }
  }
  return lines.join('\n');
}

function buildIdentitySummary(identity) {
  return [
    '### Admitted run, build, and source identity',
    '',
    '| Field | Value |',
    '| --- | --- |',
    summaryRow('Producer definition ID', identity.producerDefinitionId),
    summaryRow('Producer run ID', identity.producerRunId),
    summaryRow('Producer build number', identity.producerBuildNumber),
    summaryRow('Source SHA', identity.sourceSHA),
    summaryRow('Checkout ref', identity.checkoutRef),
    summaryRow('Repository', identity.repositoryName),
    summaryRow('Repository URI', identity.repositoryUri),
    summaryRow('Build artifact', identity.artifactName),
    summaryRow('Build artifact SHA-256', identity.artifactSHA256),
    summaryRow('Resolved VS Code build', identity.resolvedVSCodeBuild),
  ];
}

function buildTestSummary(testResult) {
  return [
    '### Native test outcome',
    '',
    '| Field | Value |',
    '| --- | --- |',
    summaryRow('Label', testResult.label),
    summaryRow('Outcome', testResult.outcome),
    summaryRow('Total', testResult.total),
    summaryRow('Passing', testResult.passing),
    summaryRow('Failing', testResult.failing),
    summaryRow('Pending', testResult.pending),
    summaryRow('Pass rate', testResult.passRate === undefined ? undefined : `${testResult.passRate}%`),
    summaryRow('Duration', testResult.duration),
  ];
}

function buildLifecycleSummary(lifecycle) {
  const lines = [
    '### Lifecycle finalization',
    '',
    '| Field | Value |',
    '| --- | --- |',
    summaryRow('Complete', lifecycle.complete),
    summaryRow('Lifecycle finalized', lifecycle.lifecycleFinalized),
    summaryRow('Exit code', lifecycle.exitCode),
    summaryRow('Signal', lifecycle.signal === null ? 'null' : lifecycle.signal),
    summaryRow('Cleanup verified', lifecycle.cleanupVerified),
    summaryRow('Original process closure verified', lifecycle.originalProcessClosureVerified),
    summaryRow('Process closure proof', lifecycle.processClosureProof),
    summaryRow('Phase completeness', lifecycle.phaseCompleteness),
    summaryRow('Exact ordered phases', lifecycle.exactPhaseOrder),
    summaryRow('Missing phases', lifecycle.missingPhaseIds.join(', ') || 'none'),
    summaryRow('Unexpected phases', lifecycle.unexpectedPhaseIds.join(', ') || 'none'),
    summaryRow('Duplicate phases', lifecycle.duplicatePhaseIds.join(', ') || 'none'),
    summaryRow('Blocked phases', lifecycle.blockedPhaseIds.join(', ') || 'none'),
    '',
    '#### Expected phase order',
    '',
    ...orderedValues(lifecycle.expectedPhaseIds),
    '',
    '#### Observed phase order',
    '',
    ...orderedValues(lifecycle.observedPhaseIds),
    '',
    '#### Per-phase status',
    '',
    '| # | Phase | Complete | Exit code | Signal | Cleanup | Diagnostics error present |',
    '| ---: | --- | --- | ---: | --- | --- | --- |',
  ];
  if (lifecycle.phaseResults.length === 0) {
    lines.push('| — | _Unavailable_ | — | — | — | — | — |');
  } else {
    lifecycle.phaseResults.forEach((phase, index) => {
      lines.push(
        `| ${index + 1} | ${markdownValue(phase.phaseId)} | ${markdownValue(phase.complete)} | ${markdownValue(
          phase.exitCode
        )} | ${markdownValue(phase.signal === null ? 'null' : phase.signal)} | ${markdownValue(
          phase.cleanupVerified
        )} | ${markdownValue(phase.diagnosticsError)} |`
      );
    });
  }
  return lines;
}

function buildStepMarkdown(entry, checkpointHumanizer = humanizeCheckpoint) {
  const title = `${String(entry.number).padStart(2, '0')}. ${checkpointHumanizer(entry.checkpoint)}`;
  const screenshotLink = fileLink(entry.screenshot, 'PNG');
  const sidecarLink = fileLink(entry.sidecar, 'JSON');
  const lines = [
    `#### ${escapeMarkdown(title)}`,
    '',
    `- **Scenario / phase:** ${escapeMarkdown(entry.groupTitle)} — ${escapeMarkdown(entry.phase)}`,
    `- **User / test action:** ${escapeMarkdown(entry.action)}`,
    `- **Expected proof:** ${escapeMarkdown(entry.expectedProof)}`,
    `- **Evidence status:** ${statusLabel(entry.status)}`,
    `- **Screenshot:** ${screenshotLink}`,
    `- **Semantic sidecar:** ${sidecarLink}`,
    `- **Classification / verdict:** ${markdownValue(entry.sidecar.classification)} / ${markdownValue(entry.sidecar.verdict)}`,
    `- **Reason codes:** ${markdownList(entry.sidecar.reasonCodes)}`,
    '',
  ];
  if (entry.screenshot.link) {
    lines.push(`[![${escapeMarkdown(title)}](${entry.screenshot.link})](${entry.screenshot.link})`, '');
  } else if (entry.screenshot.status === 'ambiguous') {
    lines.push(`_Screenshot is ambiguous: ${markdownList(entry.screenshot.candidates)}._`, '');
  } else {
    lines.push('_Screenshot PNG is missing._', '');
  }
  return lines;
}

function summaryRow(label, value) {
  return `| ${escapeMarkdown(label)} | ${markdownValue(value)} |`;
}

function summaryInputRow(label, status, file) {
  return `| ${escapeMarkdown(label)} | ${markdownValue(status)} | ${file?.link ? `[Open](${file.link})` : '—'} |`;
}

function orderedValues(values) {
  return values.length > 0 ? values.map((value, index) => `${index + 1}. \`${escapeInlineCode(value)}\``) : ['_Unavailable_'];
}

function fileLink(file, label) {
  if (file?.link) {
    return `[${label}](${file.link})`;
  }
  if (file?.status === 'ambiguous') {
    return `⚠ Ambiguous (${markdownList(file.candidates)})`;
  }
  return '⚠ Missing';
}

function markdownList(values) {
  return values?.length ? values.map((value) => `\`${escapeInlineCode(value)}\``).join(', ') : '—';
}

function markdownValue(value) {
  if (value === undefined || value === '') {
    return '—';
  }
  if (value === null) {
    return '`null`';
  }
  return escapeMarkdown(String(value));
}

function statusLabel(status) {
  const labels = {
    accepted: '✅ Accepted',
    diagnostic: 'ℹ Diagnostic',
    disabled: 'ℹ Disabled',
    rejected: '❌ Rejected',
    missing: '⚠ Missing',
    ambiguous: '⚠ Ambiguous',
    'invalid-sidecar': '❌ Invalid sidecar',
    'checkpoint-mismatch': '❌ Checkpoint mismatch',
    'diagnostic-extra': 'ℹ Diagnostic extra',
    'not-reached': '⚠ Not reached',
    'invalid-reference': '❌ Invalid reference',
    'integrity-mismatch': '❌ Integrity mismatch',
    partial: '⚠ Partial',
  };
  return labels[status] || escapeMarkdown(status);
}

function humanizeCheckpoint(checkpoint) {
  return checkpoint
    .replace(/^workspace-lifecycle-http-timeout-lifecycle-/, '')
    .replace(/^workspace-lifecycle-/, '')
    .replace(/^create-workspace-/, '')
    .replace(/^workspace-regeneration-/, '')
    .replace(/^workspace-multi-root-/, '')
    .replace(/^stateless-variables-/, '')
    .replace(/^http-timeout-request-/, '')
    .replace(/^http-timeout-compose-/, 'compose-')
    .replace(/^http-timeout-/, '')
    .split('-')
    .map((part) => (/^(pt\d+[a-z]?|iso|http)$/i.test(part) ? part.toUpperCase() : part))
    .join(' ');
}

function humanizeHistoricalHttpCheckpoint(checkpoint) {
  return checkpoint
    .replace(/^workspace-lifecycle-http-timeout-lifecycle-/, '')
    .replace(/^http-timeout-request-/, '')
    .replace(/^http-timeout-compose-/, 'compose-')
    .replace(/^http-timeout-/, '')
    .split('-')
    .map((part) => (/^(pt\d+[a-z]?|iso|http)$/i.test(part) ? part.toUpperCase() : part))
    .join(' ');
}

function escapeMarkdown(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/([`*_[\]|])/g, '\\$1');
}

function escapeInlineCode(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = generateVscodeE2eEvidenceReport({
      suiteId: options['suite-id'],
      artifactRoot: options['artifact-root'],
      resultPath: options.result,
      terminalResultPath: options['terminal-result'],
      admissionContextPath: options['admission-context'],
      evidenceManifest: options['evidence-manifest'],
    });
    console.log(
      `[vscode-e2e-evidence] ${result.manifest.suiteId}: wrote ${path.basename(result.markdownPath)} and ${path.basename(
        result.manifestPath
      )}`
    );
  } catch (error) {
    console.error(`[vscode-e2e-evidence] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

module.exports = {
  generateVscodeE2eEvidenceReport,
  parseArgs,
  _test: {
    artifactRelativeLink,
    artifactRelativePath,
    buildHttpCompatibilityMarkdown,
    buildMarkdown,
    buildHttpCompatibilityManifest,
    buildHttpCompatibilitySummary,
    buildSummary,
    buildManifestAttachments,
    buildManifestEvidence,
    escapeInlineCode,
    humanizeCheckpoint,
    requireManifestReferencePath,
  },
};
