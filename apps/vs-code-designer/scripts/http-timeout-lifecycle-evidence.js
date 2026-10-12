#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const fs = require('node:fs');
const path = require('node:path');

const suiteId = 'httpTimeoutLifecycle';
const markdownFileName = 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.md';
const manifestFileName = 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.json';

const catalogGroups = Object.freeze([
  Object.freeze({
    id: 'workspace-setup',
    title: 'Workspace setup',
    description:
      'Creates the Standard Stateless workspace through the product wizard and records the transition into the reopened debug host.',
    steps: Object.freeze([
      step(
        'workspace-lifecycle-http-timeout-lifecycle-create-workspace-form-ready',
        'Create phase',
        'Open the Create Workspace form.',
        'The initial wizard is bound to the active Create Workspace webview with empty required fields and disabled progression.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-parent-folder-entered',
        'Create phase',
        'Enter the owned workspace parent folder.',
        'The wizard shows the selected parent folder and keeps progression gated until the remaining fields are valid.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-workspace-name-entered',
        'Create phase',
        'Enter the generated workspace name.',
        'The workspace name is visible in the wizard with no accepted progression inferred from unrelated fields.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-required-fields-entered',
        'Create phase',
        'Enter the Logic App and workflow names.',
        'All required naming fields are populated before the workflow type completes the form.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-type-selected',
        'Create phase',
        'Select the Standard Stateless workflow type.',
        'The requested application/workflow type is selected and the completed form can progress.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-fields-verified-top',
        'Create phase',
        'Verify the top of the completed workspace form.',
        'The top field region is visible, semantically bound, and the completed form can progress.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-fields-verified-middle',
        'Create phase',
        'Verify the middle of the completed workspace form.',
        'The middle field region is visible and remains correlated with the same completed form.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-fields-verified-bottom',
        'Create phase',
        'Verify the bottom of the completed workspace form.',
        'The lower field region is visible and the Next action remains enabled.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-review',
        'Create phase',
        'Advance to Review + create.',
        'The review page echoes the requested workspace, Logic App, workflow, and Stateless selections with Create enabled.'
      ),
    ]),
  }),
  Object.freeze({
    id: 'scenario-1',
    title: 'Scenario 1 — PT1S execution',
    description:
      'Authors Request + HTTP with a one-second timeout, saves the definition, invokes the local callback, and proves the correlated HTTP action fails with timeout evidence.',
    steps: Object.freeze([
      step(
        'http-timeout-request-pt1s-designer-ready',
        'Scenario 1 authoring',
        'Open the generated workflow in Designer.',
        'The active workflow Designer is ready before Request and HTTP authoring begins.'
      ),
      step(
        'http-timeout-request-pt1s-request-inserted',
        'Scenario 1 authoring',
        'Insert the Request trigger.',
        'The workflow canvas contains the expected Request trigger.'
      ),
      step(
        'http-timeout-request-pt1s-http-panel-ready',
        'Scenario 1 authoring',
        'Insert HTTP and open its parameter panel.',
        'The HTTP action and its active parameter panel are visible and bound to the workflow.'
      ),
      step(
        'http-timeout-request-pt1s-method-selected',
        'Scenario 1 authoring',
        'Select the HTTP method.',
        'The Method field contains the expected selection in the active HTTP panel.'
      ),
      step(
        'http-timeout-request-pt1s-uri-configured',
        'Scenario 1 authoring',
        'Configure the runner-owned delayed endpoint URI.',
        'The required URI field is populated without exposing the raw endpoint in report metadata.'
      ),
      step(
        'http-timeout-request-pt1s-timeout-configured',
        'Scenario 1 authoring',
        'Set the HTTP timeout to PT1S.',
        'The active HTTP settings show the one-second ISO-8601 timeout.'
      ),
      step(
        'http-timeout-request-pt1s-async-pattern-off',
        'Scenario 1 authoring',
        'Disable the asynchronous pattern.',
        'The asynchronous-pattern switch is visibly off for the HTTP action.'
      ),
      step(
        'http-timeout-request-pt1s-saved',
        'Scenario 1 authoring',
        'Save the PT1S workflow.',
        'The Designer save completes with the expected Request + HTTP state.'
      ),
      step(
        'http-timeout-request-pt1s-overview-empty',
        'Scenario 1 execution',
        'Open Overview before invoking the trigger.',
        'The exact workflow Overview is visible before the correlated run is created.'
      ),
      step(
        'http-timeout-request-pt1s-overview-run-triggered',
        'Scenario 1 execution',
        'Invoke the exact local callback.',
        'Overview shows the newly correlated run after the trigger request.'
      ),
      step(
        'http-timeout-request-pt1s-overview-run-failed',
        'Scenario 1 execution',
        'Wait for the correlated run to fail.',
        'The exact run is shown with Failed status.'
      ),
      step(
        'http-timeout-request-pt1s-http-action-failed',
        'Scenario 1 execution',
        'Open monitoring for the failed HTTP action.',
        'The HTTP action is selected and displays timeout-specific failure evidence.'
      ),
    ]),
  }),
  Object.freeze({
    id: 'scenario-2',
    title: 'Scenario 2 — PT24H and InvalidString validation',
    description:
      'Changes only the existing HTTP timeout to PT24H, proves runtime validation, then verifies invalid ISO-8601 input cannot overwrite the persisted valid definition.',
    steps: Object.freeze([
      step(
        'http-timeout-request-pt24h-designer-reopened',
        'Scenario 2 PT24H',
        'Reopen the same workflow Designer.',
        'The existing Request + HTTP workflow is reopened before changing its timeout.'
      ),
      step(
        'http-timeout-request-pt24h-timeout-configured',
        'Scenario 2 PT24H',
        'Change the HTTP timeout to PT24H.',
        'The active HTTP settings show the 24-hour timeout.'
      ),
      step(
        'http-timeout-request-pt24h-async-pattern-off',
        'Scenario 2 PT24H',
        'Keep the asynchronous pattern disabled.',
        'The asynchronous-pattern switch remains visibly off after the timeout change.'
      ),
      step(
        'http-timeout-request-pt24h-saved',
        'Scenario 2 PT24H',
        'Save the PT24H workflow.',
        'The Designer save completes with PT24H persisted.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-debug-starting',
        'Scenario 2 PT24H',
        'Start debugging for PT24H runtime validation while prompt handling runs in parallel.',
        'The retained lifecycle diagnostic records the transient workbench state for the latest debug start.',
        'diagnostic'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-debug-prompts-handled',
        'Scenario 2 PT24H',
        'Complete the known prompts for the PT24H debug start.',
        'The retained lifecycle diagnostic records the workbench after the latest required prompt handling.',
        'diagnostic'
      ),
      step(
        'http-timeout-request-pt24h-runtime-validation',
        'Scenario 2 PT24H',
        'Observe Functions runtime validation.',
        'The required PT24H validation text is visible in the trusted runtime output surface.'
      ),
      step(
        'http-timeout-request-invalid-designer-reopened',
        'Scenario 2 InvalidString',
        'Reopen the same workflow for invalid-value validation.',
        'The persisted PT24H workflow is visible before invalid input is entered.'
      ),
      step(
        'http-timeout-request-invalid-value-entered',
        'Scenario 2 InvalidString',
        'Enter InvalidString as the timeout.',
        'The invalid value is present in the active HTTP settings.'
      ),
      step(
        'http-timeout-request-invalid-duration',
        'Scenario 2 InvalidString',
        'Reveal the ISO-8601 validation failure.',
        'The invalid-duration message is visible and Save remains unavailable.'
      ),
      step(
        'http-timeout-request-valid-state-restored',
        'Scenario 2 InvalidString',
        'Restore the valid PT24H editor state.',
        'The Designer returns to the valid PT24H state without persisting InvalidString.'
      ),
      step(
        'http-timeout-request-scenario-2-complete-before-reset',
        'Scenario 2 completion',
        'Prove Scenario 2 completed before destructive reset.',
        'The valid Request + HTTP PT24H workflow remains visible immediately before Scenario 3 removes it.'
      ),
    ]),
  }),
  Object.freeze({
    id: 'scenario-3',
    title: 'Scenario 3 — Compose native-editor validation',
    description:
      'Clears Request + HTTP, authors Request + Compose, edits only Compose runtimeConfiguration in the native editor, and proves Designer reports the unsupported timeout.',
    steps: Object.freeze([
      step(
        'http-timeout-transition-cleared',
        'Scenario 3 transition',
        'Delete HTTP and Request through Designer.',
        'The same workflow canvas is visibly clear before Compose authoring.'
      ),
      step(
        'http-timeout-compose-authored',
        'Scenario 3 authoring',
        'Author and save Request + Compose with input test.',
        'The workflow contains the newly authored Compose action in the expected saved state.'
      ),
      step(
        'http-timeout-compose-native-editor-open',
        'Scenario 3 native editor',
        'Open the exact workflow.json in the native editor.',
        'The active native text editor is bound to the generated workflow file before replacement.'
      ),
      step(
        'http-timeout-compose-native-editor-replaced',
        'Scenario 3 native editor',
        'Insert only Compose runtimeConfiguration.requestOptions.timeout.',
        'The native editor shows the targeted PT24H Compose timeout replacement before save/close.'
      ),
      step(
        'http-timeout-compose-unsupported-error',
        'Scenario 3 validation',
        'Reopen Designer after the native edit.',
        'The newly reopened workflow Designer displays the exact unsupported-timeout error.'
      ),
    ]),
  }),
]);

function step(checkpoint, phase, action, expectedProof, expectedClassification = 'evidence') {
  return Object.freeze({ checkpoint, phase, action, expectedProof, expectedClassification });
}

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

function getDefaultPaths(artifactRoot) {
  const resultsRoot = path.join(artifactRoot, 'results');
  return {
    resultPath: path.join(resultsRoot, `${suiteId}.json`),
    terminalResultPath: path.join(resultsRoot, `${suiteId}.terminal-result.json`),
    admissionContextPath: path.join(resultsRoot, `admission-context-${suiteId}.json`),
    screenshotsDir: path.join(artifactRoot, 'screenshots'),
  };
}

function generateHttpTimeoutLifecycleEvidence(options) {
  const artifactRoot = path.resolve(requiredOption(options.artifactRoot, 'artifactRoot'));
  fs.mkdirSync(artifactRoot, { recursive: true });
  const defaults = getDefaultPaths(artifactRoot);
  const inputs = {
    result: readStructuredJson(options.resultPath || defaults.resultPath),
    terminalResult: readStructuredJson(options.terminalResultPath || defaults.terminalResultPath),
    admissionContext: readStructuredJson(options.admissionContextPath || defaults.admissionContextPath),
  };
  const screenshotsDir = path.resolve(options.screenshotsDir || defaults.screenshotsDir);
  const screenshotFiles = indexScreenshotFiles(screenshotsDir);
  const groups = buildCatalogEvidence({ artifactRoot, screenshotFiles });
  const extras = buildDiagnosticExtras({ artifactRoot, screenshotFiles, groups });
  const summary = buildSummary(inputs);
  const generatedAt = new Date().toISOString();
  const manifest = {
    schemaVersion: 1,
    suiteId,
    generatedAt,
    report: markdownFileName,
    canonicalStepCount: groups.reduce((count, group) => count + group.steps.length, 0),
    summary,
    sourceFiles: {
      result: describeInputFile(artifactRoot, inputs.result),
      terminalResult: describeInputFile(artifactRoot, inputs.terminalResult),
      admissionContext: describeInputFile(artifactRoot, inputs.admissionContext),
      screenshots: describeDirectory(artifactRoot, screenshotsDir),
    },
    groups,
    diagnosticExtras: extras,
  };
  const markdown = buildMarkdown(manifest);
  const markdownPath = path.join(artifactRoot, markdownFileName);
  const manifestPath = path.join(artifactRoot, manifestFileName);
  fs.writeFileSync(markdownPath, `${markdown.trimEnd()}\n`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { markdownPath, manifestPath, manifest, markdown };
}

function requiredOption(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
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

function indexScreenshotFiles(screenshotsDir) {
  const pngByBase = new Map();
  const sidecarByBase = new Map();
  if (!fs.existsSync(screenshotsDir)) {
    return { screenshotsDir, pngByBase, sidecarByBase };
  }
  const stack = [screenshotsDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (extension !== '.png' && extension !== '.json') {
        continue;
      }
      const base = path.basename(entry.name, extension);
      const target = extension === '.png' ? pngByBase : sidecarByBase;
      const values = target.get(base) || [];
      values.push(fullPath);
      target.set(base, values);
    }
  }
  for (const values of [...pngByBase.values(), ...sidecarByBase.values()]) {
    values.sort((left, right) => left.localeCompare(right));
  }
  return { screenshotsDir, pngByBase, sidecarByBase };
}

function buildCatalogEvidence({ artifactRoot, screenshotFiles }) {
  let number = 0;
  return catalogGroups.map((group) => ({
    id: group.id,
    title: group.title,
    description: group.description,
    steps: group.steps.map((catalogStep) => {
      number++;
      return buildEvidenceRecord({
        artifactRoot,
        screenshotFiles,
        number,
        groupId: group.id,
        groupTitle: group.title,
        ...catalogStep,
      });
    }),
  }));
}

function buildEvidenceRecord({
  artifactRoot,
  screenshotFiles,
  number,
  groupId,
  groupTitle,
  checkpoint,
  phase,
  action,
  expectedProof,
  expectedClassification,
}) {
  const pngCandidates = screenshotFiles.pngByBase.get(checkpoint) || [];
  const sidecarCandidates = screenshotFiles.sidecarByBase.get(checkpoint) || [];
  const pngPath = pngCandidates.length === 1 ? pngCandidates[0] : undefined;
  const sidecarPath = sidecarCandidates.length === 1 ? sidecarCandidates[0] : undefined;
  const sidecar = sidecarPath ? readScreenshotSidecar(sidecarPath) : { status: 'missing' };
  const status = classifyEvidence({
    checkpoint,
    expectedClassification,
    pngCandidates,
    sidecarCandidates,
    sidecar,
  });
  return {
    number,
    groupId,
    groupTitle,
    checkpoint,
    phase,
    action,
    expectedProof,
    expectedClassification,
    status,
    screenshot: describeEvidenceFile(artifactRoot, pngPath, pngCandidates),
    sidecar: {
      ...describeEvidenceFile(artifactRoot, sidecarPath, sidecarCandidates),
      status: sidecar.status,
      classification: safeEnum(sidecar.value?.classification, ['evidence', 'diagnostic']),
      verdict: safeEnum(sidecar.value?.verdict, ['accepted', 'diagnostic', 'disabled', 'failed']),
      reasonCodes: safeStringArray(sidecar.value?.reasonCodes, 12),
      checkpoint: safeScalar(sidecar.value?.checkpoint),
      phase: safeScalar(sidecar.value?.phase),
    },
  };
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

function classifyEvidence({ checkpoint, expectedClassification, pngCandidates, sidecarCandidates, sidecar }) {
  if (pngCandidates.length > 1 || sidecarCandidates.length > 1) {
    return 'ambiguous';
  }
  if (pngCandidates.length === 0 || sidecarCandidates.length === 0) {
    return 'missing';
  }
  if (sidecar.status !== 'available') {
    return 'invalid-sidecar';
  }
  if (sidecar.value.checkpoint !== checkpoint) {
    return 'checkpoint-mismatch';
  }
  const classification = sidecar.value.classification;
  const verdict = sidecar.value.verdict;
  if (expectedClassification === 'diagnostic') {
    return classification === 'diagnostic' && verdict === 'diagnostic' ? 'diagnostic' : 'rejected';
  }
  return classification === 'evidence' && verdict === 'accepted' ? 'accepted' : 'rejected';
}

function buildDiagnosticExtras({ artifactRoot, screenshotFiles, groups }) {
  const canonicalCheckpoints = new Set(groups.flatMap((group) => group.steps.map((entry) => entry.checkpoint)));
  const extraBases = new Set(
    [...screenshotFiles.pngByBase.keys(), ...screenshotFiles.sidecarByBase.keys()].filter((base) => !canonicalCheckpoints.has(base))
  );
  return [...extraBases]
    .map((checkpoint) => {
      const pngCandidates = screenshotFiles.pngByBase.get(checkpoint) || [];
      const sidecarCandidates = screenshotFiles.sidecarByBase.get(checkpoint) || [];
      const pngPath = pngCandidates.length === 1 ? pngCandidates[0] : undefined;
      const sidecarPath = sidecarCandidates.length === 1 ? sidecarCandidates[0] : undefined;
      const sidecar = sidecarPath ? readScreenshotSidecar(sidecarPath) : { status: 'missing' };
      return {
        checkpoint,
        status:
          pngCandidates.length > 1 || sidecarCandidates.length > 1
            ? 'ambiguous'
            : pngCandidates.length === 0 || sidecarCandidates.length === 0
              ? 'partial'
              : sidecar.status === 'invalid'
                ? 'invalid-sidecar'
                : 'diagnostic-extra',
        screenshot: describeEvidenceFile(artifactRoot, pngPath, pngCandidates),
        sidecar: {
          ...describeEvidenceFile(artifactRoot, sidecarPath, sidecarCandidates),
          status: sidecar.status,
          classification: safeEnum(sidecar.value?.classification, ['evidence', 'diagnostic']),
          verdict: safeEnum(sidecar.value?.verdict, ['accepted', 'diagnostic', 'disabled', 'failed']),
          reasonCodes: safeStringArray(sidecar.value?.reasonCodes, 12),
        },
      };
    })
    .sort((left, right) => {
      const leftPath = left.screenshot.path || left.sidecar.path || left.checkpoint;
      const rightPath = right.screenshot.path || right.sidecar.path || right.checkpoint;
      return leftPath.localeCompare(rightPath);
    });
}

function describeEvidenceFile(artifactRoot, selectedPath, candidates) {
  return {
    status: candidates.length > 1 ? 'ambiguous' : selectedPath ? 'available' : 'missing',
    path: selectedPath ? artifactRelativePath(artifactRoot, selectedPath) : undefined,
    link: selectedPath ? artifactRelativeLink(artifactRoot, selectedPath) : undefined,
    candidates: candidates.length > 1 ? candidates.map((candidate) => artifactRelativePath(artifactRoot, candidate)).filter(Boolean) : [],
  };
}

function buildSummary(inputs) {
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

function buildMarkdown(manifest) {
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
    `- **Machine-readable manifest:** [${manifestFileName}](${manifestFileName})`,
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
      lines.push(...buildStepMarkdown(entry));
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

function buildStepMarkdown(entry) {
  const title = `${String(entry.number).padStart(2, '0')}. ${humanizeCheckpoint(entry.checkpoint)}`;
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
    rejected: '❌ Rejected',
    missing: '⚠ Missing',
    ambiguous: '⚠ Ambiguous',
    'invalid-sidecar': '❌ Invalid sidecar',
    'checkpoint-mismatch': '❌ Checkpoint mismatch',
    'diagnostic-extra': 'ℹ Diagnostic extra',
    partial: '⚠ Partial',
  };
  return labels[status] || escapeMarkdown(status);
}

function humanizeCheckpoint(checkpoint) {
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
  return String(value).replace(/`/g, '\\`');
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const artifactRoot = options['artifact-root'];
    const result = generateHttpTimeoutLifecycleEvidence({
      artifactRoot,
      resultPath: options.result,
      terminalResultPath: options['terminal-result'],
      admissionContextPath: options['admission-context'],
      screenshotsDir: options.screenshots,
    });
    console.log(`[http-timeout-evidence] Wrote ${path.basename(result.markdownPath)} and ${path.basename(result.manifestPath)}`);
  } catch (error) {
    console.error(`[http-timeout-evidence] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

module.exports = {
  catalogGroups,
  generateHttpTimeoutLifecycleEvidence,
  _test: {
    artifactRelativeLink,
    artifactRelativePath,
    buildMarkdown,
    buildSummary,
    classifyEvidence,
    humanizeCheckpoint,
    indexScreenshotFiles,
  },
};
