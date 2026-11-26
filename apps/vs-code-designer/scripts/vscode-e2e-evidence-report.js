#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const fs = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');
const { createHash } = require('node:crypto');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const { readEvidenceManifest } = require('./vscode-e2e-evidence-manifest');
const { evaluateLifecycleAcceptance } = require('./vscode-lifecycle-acceptance');

const markdownFileName = 'VS_CODE_CLI_EVIDENCE.md';
const manifestFileName = 'VS_CODE_CLI_EVIDENCE.json';
const htmlFileName = 'evidence.html';
const httpMarkdownFileName = 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.md';
const httpManifestFileName = 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.json';
const maxEmbeddedHtmlBytes = 100 * 1024 * 1024;

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
    selfContainedReport: htmlFileName,
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
  const htmlPath = path.join(artifactRoot, htmlFileName);
  fs.writeFileSync(markdownPath, `${markdown.trimEnd()}\n`);
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
  let html;
  try {
    html = buildHtml(manifest, artifactRoot, options.maxHtmlBytes ?? maxEmbeddedHtmlBytes);
    manifest.selfContainedReportStatus = { images: 'embedded' };
  } catch (error) {
    const reason = htmlFallbackReason(error);
    manifest.selfContainedReportStatus = { images: 'omitted', reason };
    html = buildHtml(manifest, artifactRoot, maxEmbeddedHtmlBytes, { embedImages: false, warning: reason });
  }
  fs.writeFileSync(htmlPath, html);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { htmlPath, markdownPath, manifestPath, aliasPaths, compatibility, manifest, html, markdown };
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
        processAcceptance: evaluateLifecycleAcceptance(phase?.processCleanup || {}, phase?.processCleanup?.lifecycleEvidence),
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
      processAcceptance: evaluateLifecycleAcceptance(terminal.processCleanup || {}, terminal.processCleanup?.lifecycleEvidence),
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
    sha256,
    size: bytes.length,
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
        processAcceptance: evaluateLifecycleAcceptance(phase?.processCleanup || {}, phase?.processCleanup?.lifecycleEvidence),
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
      processAcceptance: evaluateLifecycleAcceptance(terminal.processCleanup || {}, terminal.processCleanup?.lifecycleEvidence),
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

function buildHtml(manifest, artifactRoot, maxBytes = maxEmbeddedHtmlBytes, options = {}) {
  const embedImages = options.embedImages !== false;
  if (embedImages) {
    const projectedBytes =
      1024 * 1024 +
      evidenceScreenshots(manifest)
        .filter((screenshot) => screenshot?.status === 'available')
        .reduce((total, screenshot) => total + Math.ceil(screenshot.size / 3) * 4 + 64, 0);
    if (projectedBytes > maxBytes) {
      throw new Error(`Self-contained evidence HTML is too large: projected ${projectedBytes} bytes (limit ${maxBytes})`);
    }
  }
  const renderImage = (screenshot, label) => {
    if (embedImages && ['integrity-mismatch', 'invalid-reference'].includes(screenshot?.status)) {
      throw new Error(`Embedded screenshot integrity mismatch: ${screenshot.path || 'unknown'}`);
    }
    if (screenshot?.status !== 'available') {
      return `<p class="missing">Screenshot unavailable (${escapeHtml(screenshot?.status || 'missing')}).</p>`;
    }
    if (!embedImages) {
      return '<p class="missing">Screenshot embedding was omitted; inspect the compact evidence files in the full diagnostics artifact.</p>';
    }
    return `<img src="${embeddedPngDataUri(artifactRoot, screenshot)}" alt="${escapeHtml(label)}" loading="lazy">`;
  };
  const renderStep = (entry) => {
    const title = `${String(entry.number).padStart(3, '0')}. ${humanizeCheckpoint(entry.checkpoint)}`;
    return `<article class="checkpoint ${htmlStatusClass(entry.status)}">
      <h3>${escapeHtml(title)}</h3>
      <dl>
        <dt>Phase</dt><dd>${escapeHtml(entry.phase)}</dd>
        <dt>Action</dt><dd>${escapeHtml(entry.action)}</dd>
        <dt>Expected proof</dt><dd>${escapeHtml(entry.expectedProof)}</dd>
        <dt>Status</dt><dd>${escapeHtml(statusLabel(entry.status))}</dd>
        <dt>Classification / verdict</dt><dd>${escapeHtml(entry.sidecar.classification || '—')} / ${escapeHtml(
          entry.sidecar.verdict || '—'
        )}</dd>
        <dt>Reason codes</dt><dd>${escapeHtml(entry.sidecar.reasonCodes?.join(', ') || '—')}</dd>
      </dl>
      ${renderImage(entry.screenshot, title)}
    </article>`;
  };
  const groups = manifest.groups
    .map(
      (group) => `<section>
        <h2>${escapeHtml(group.title)}</h2>
        <p>${escapeHtml(group.description)}</p>
        ${group.steps.map(renderStep).join('\n')}
      </section>`
    )
    .join('\n');
  const extras =
    manifest.diagnosticExtras.length === 0
      ? '<p>No additional diagnostic screenshots were staged.</p>'
      : manifest.diagnosticExtras
          .map(
            (extra) => `<article class="checkpoint diagnostic">
              <h3>${escapeHtml(extra.checkpoint)}</h3>
              <p><strong>Status:</strong> ${escapeHtml(statusLabel(extra.status))}</p>
              <p><strong>Reason codes:</strong> ${escapeHtml(extra.sidecar.reasonCodes?.join(', ') || '—')}</p>
              ${renderImage(extra.screenshot, extra.checkpoint)}
            </article>`
          )
          .join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <title>${escapeHtml(manifest.suiteTitle)} evidence</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.45; }
    body { max-width: 1200px; margin: 0 auto; padding: 24px; }
    header, section, article { border: 1px solid #8886; border-radius: 8px; padding: 16px; margin: 16px 0; }
    header { background: #0969da18; }
    dl { display: grid; grid-template-columns: minmax(140px, 220px) 1fr; gap: 6px 16px; }
    dt { font-weight: 600; }
    dd { margin: 0; overflow-wrap: anywhere; }
    img { display: block; max-width: 100%; height: auto; margin: 16px auto 0; border: 1px solid #8886; }
    .accepted { border-left: 6px solid #1a7f37; }
    .diagnostic, .not-reached, .missing { border-left: 6px solid #9a6700; }
    .rejected, .integrity-mismatch, .invalid-reference { border-left: 6px solid #cf222e; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #8886; padding: 6px 8px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(manifest.suiteTitle)} evidence</h1>
    <p>This self-contained report embeds all verified PNG evidence. Test, lifecycle, cleanup, process-closure, and terminal gates remain authoritative.</p>
    ${options.warning ? `<p class="missing"><strong>Embedded images omitted:</strong> ${escapeHtml(options.warning)}</p>` : ''}
    ${htmlTable([
      ['Generated', manifest.generatedAt],
      ['Suite ID', manifest.suiteId],
      ['Canonical checkpoints', manifest.canonicalStepCount],
      ['Diagnostic extras', manifest.diagnosticExtras.length],
      ['Outcome', manifest.summary.testResult.outcome],
      ['Source SHA', manifest.summary.identity.sourceSHA],
      ['Resolved VS Code', manifest.summary.identity.resolvedVSCodeBuild],
    ])}
  </header>
  <section>
    <h2>Run summary</h2>
    ${htmlTable([
      ['Producer run', manifest.summary.identity.producerRunId],
      ['Build number', manifest.summary.identity.producerBuildNumber],
      ['Repository', manifest.summary.identity.repositoryName],
      [
        'Passing / failing / pending',
        `${manifest.summary.testResult.passing ?? '—'} / ${manifest.summary.testResult.failing ?? '—'} / ${
          manifest.summary.testResult.pending ?? '—'
        }`,
      ],
      ['Lifecycle complete', manifest.summary.lifecycle.complete],
      ['Cleanup verified', manifest.summary.lifecycle.cleanupVerified],
      ['Exact phase order', manifest.summary.lifecycle.exactPhaseOrder],
    ])}
  </section>
  ${groups}
  <section>
    <h2>Additional diagnostic screenshots</h2>
    ${extras}
  </section>
</body>
</html>
`;
  const bytes = Buffer.byteLength(html);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || bytes > maxBytes) {
    throw new Error(`Self-contained evidence HTML is too large: ${bytes} bytes (limit ${maxBytes})`);
  }
  return html;
}

function evidenceScreenshots(manifest) {
  return [
    ...manifest.groups.flatMap((group) => group.steps.map((entry) => entry.screenshot)),
    ...manifest.diagnosticExtras.map((entry) => entry.screenshot),
  ];
}

function htmlFallbackReason(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/too large/i.test(message)) {
    return 'report-size-limit';
  }
  if (/integrity mismatch|regular file|invalid ordered evidence reference/i.test(message)) {
    return 'image-integrity-unavailable';
  }
  return 'image-embedding-unavailable';
}

function embeddedPngDataUri(artifactRoot, screenshot) {
  const filePath = requireManifestReferencePath(artifactRoot, screenshot.path, '.png');
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`Embedded screenshot is not a regular file: ${screenshot.path}`);
  }
  const bytes = fs.readFileSync(filePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== screenshot.size || sha256 !== screenshot.sha256) {
    throw new Error(`Embedded screenshot integrity mismatch: ${screenshot.path}`);
  }
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function htmlTable(rows) {
  return `<table><tbody>${rows
    .map(
      ([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value === undefined || value === '' ? '—' : value)}</td></tr>`
    )
    .join('')}</tbody></table>`;
}

function htmlStatusClass(status) {
  return /^[a-z0-9-]+$/.test(status || '') ? status : 'unknown';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    summaryRow('Product shutdown/resources/subsequent startup', lifecycle.processAcceptance?.product),
    summaryRow('Infrastructure containment', lifecycle.processAcceptance?.infrastructure),
    summaryRow('Recovery attempted (sticky)', lifecycle.processAcceptance?.recovered),
    summaryRow('Process policy reason', lifecycle.processAcceptance?.reason),
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
      `[vscode-e2e-evidence] ${result.manifest.suiteId}: wrote ${path.basename(result.htmlPath)}, ${path.basename(
        result.markdownPath
      )}, and ${path.basename(result.manifestPath)}`
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
    buildHtml,
    buildHttpCompatibilityMarkdown,
    buildMarkdown,
    buildHttpCompatibilityManifest,
    buildHttpCompatibilitySummary,
    buildSummary,
    buildManifestAttachments,
    buildManifestEvidence,
    escapeHtml,
    escapeInlineCode,
    humanizeCheckpoint,
    requireManifestReferencePath,
  },
};
