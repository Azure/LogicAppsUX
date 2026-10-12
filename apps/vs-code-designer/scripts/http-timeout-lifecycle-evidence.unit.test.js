/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global Buffer, __dirname, process, require */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { catalogGroups, generateHttpTimeoutLifecycleEvidence, _test } = require('./http-timeout-lifecycle-evidence');

const expectedCheckpoints = [
  'workspace-lifecycle-http-timeout-lifecycle-create-workspace-form-ready',
  'workspace-lifecycle-http-timeout-lifecycle-parent-folder-entered',
  'workspace-lifecycle-http-timeout-lifecycle-workspace-name-entered',
  'workspace-lifecycle-http-timeout-lifecycle-required-fields-entered',
  'workspace-lifecycle-http-timeout-lifecycle-type-selected',
  'workspace-lifecycle-http-timeout-lifecycle-fields-verified-top',
  'workspace-lifecycle-http-timeout-lifecycle-fields-verified-middle',
  'workspace-lifecycle-http-timeout-lifecycle-fields-verified-bottom',
  'workspace-lifecycle-http-timeout-lifecycle-review',
  'http-timeout-request-pt1s-designer-ready',
  'http-timeout-request-pt1s-request-inserted',
  'http-timeout-request-pt1s-http-panel-ready',
  'http-timeout-request-pt1s-method-selected',
  'http-timeout-request-pt1s-uri-configured',
  'http-timeout-request-pt1s-timeout-configured',
  'http-timeout-request-pt1s-async-pattern-off',
  'http-timeout-request-pt1s-saved',
  'http-timeout-request-pt1s-overview-empty',
  'http-timeout-request-pt1s-overview-run-triggered',
  'http-timeout-request-pt1s-overview-run-failed',
  'http-timeout-request-pt1s-http-action-failed',
  'http-timeout-request-pt24h-designer-reopened',
  'http-timeout-request-pt24h-timeout-configured',
  'http-timeout-request-pt24h-async-pattern-off',
  'http-timeout-request-pt24h-saved',
  'workspace-lifecycle-http-timeout-lifecycle-debug-starting',
  'workspace-lifecycle-http-timeout-lifecycle-debug-prompts-handled',
  'http-timeout-request-pt24h-runtime-validation',
  'http-timeout-request-invalid-designer-reopened',
  'http-timeout-request-invalid-value-entered',
  'http-timeout-request-invalid-duration',
  'http-timeout-request-valid-state-restored',
  'http-timeout-request-scenario-2-complete-before-reset',
  'http-timeout-transition-cleared',
  'http-timeout-compose-authored',
  'http-timeout-compose-native-editor-open',
  'http-timeout-compose-native-editor-replaced',
  'http-timeout-compose-unsupported-error',
];

test('canonical catalog preserves the exact 38-step order and grouped descriptions', () => {
  assert.deepEqual(
    catalogGroups.map((group) => group.title),
    [
      'Workspace setup',
      'Scenario 1 — PT1S execution',
      'Scenario 2 — PT24H and InvalidString validation',
      'Scenario 3 — Compose native-editor validation',
    ]
  );
  assert.deepEqual(
    catalogGroups.map((group) => group.steps.length),
    [9, 12, 12, 5]
  );
  assert.deepEqual(
    catalogGroups.flatMap((group) => group.steps.map((entry) => entry.checkpoint)),
    expectedCheckpoints
  );
  assert.ok(catalogGroups.every((group) => group.description.length > 40));
  assert.deepEqual(
    catalogGroups[2].steps.filter((entry) => entry.expectedClassification === 'diagnostic').map((entry) => entry.checkpoint),
    ['workspace-lifecycle-http-timeout-lifecycle-debug-starting', 'workspace-lifecycle-http-timeout-lifecycle-debug-prompts-handled']
  );
});

test('canonical catalog follows the production screenshot capture order', () => {
  const workspaceLifecycleSource = fs.readFileSync(path.resolve(__dirname, '../src/test/e2e/workspaceLifecycle.test.ts'), 'utf8');
  const createOrchestration = sourceSection(
    workspaceLifecycleSource,
    'async function createWorkspaceThroughWebview',
    'async function captureWorkspaceLifecycleFailureBeforeCleanup'
  );
  assertSourceOrder(createOrchestration, [
    'await openCreateWorkspaceContext',
    'await fillWorkspaceCreationFields',
    'await captureWorkspaceCreationFormScreenshots',
    'workspace-lifecycle-${creationCase.label}-review',
  ]);
  assert.match(
    sourceSection(workspaceLifecycleSource, 'async function openCreateWorkspaceContext', 'async function fillWorkspaceCreationFields'),
    /create-workspace-form-ready/
  );
  assertSourceOrder(
    sourceSection(workspaceLifecycleSource, 'async function fillWorkspaceCreationFields', 'async function assertWorkspaceCreationFields'),
    ['parent-folder-entered', 'workspace-name-entered', 'required-fields-entered', 'type-selected']
  );
  assert.match(
    sourceSection(
      workspaceLifecycleSource,
      'async function captureWorkspaceCreationFormScreenshots',
      'function getLifecycleCreateWorkspaceFieldContracts'
    ),
    /\['top', 'middle', 'bottom'\]/
  );

  const httpLifecycleSource = fs.readFileSync(path.resolve(__dirname, '../src/test/e2e/httpTimeoutComposeOriginal.test.ts'), 'utf8');
  assertSourceOrder(
    sourceSection(httpLifecycleSource, 'async function authorHttpRequest', 'interface HttpTimeoutUpdateCheckpoints'),
    expectedCheckpoints.slice(9, 17)
  );
  const pt1sExecution = sourceSection(
    httpLifecycleSource,
    'async function provePt1sExecution',
    'async function captureFailedHttpMonitoringEvidence'
  );
  assertSourceOrder(pt1sExecution, expectedCheckpoints.slice(17, 20));
  assert.match(pt1sExecution, /await captureFailedHttpMonitoringEvidence/);
  assert.match(
    sourceSection(
      httpLifecycleSource,
      'async function captureFailedHttpMonitoringEvidence',
      'function isRecoverableFailedHttpMonitoringEvidenceError'
    ),
    new RegExp(expectedCheckpoints[20])
  );
  const scenario2 = sourceSection(httpLifecycleSource, 'async function provePt24hAndInvalidValidation', 'async function authorHttpRequest');
  assertSourceOrder(scenario2, [
    ...expectedCheckpoints.slice(21, 25),
    'await helpers.startDebuggingGeneratedWorkspace',
    ...expectedCheckpoints.slice(27, 32),
  ]);
  const debugHelper = sourceSection(
    workspaceLifecycleSource,
    'async function startDebuggingGeneratedWorkspace',
    'async function waitForDebugStartup'
  );
  assertSourceOrder(debugHelper, ['-debug-starting', '-debug-prompts-handled']);
  assertSourceOrder(
    sourceSection(httpLifecycleSource, 'async function proveComposeUnsupportedTimeoutOnSameWorkflow', 'interface DesignerSession'),
    expectedCheckpoints.slice(32)
  );
});

test('generator correlates summary fields and accepted ordered screenshots', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot);
    writeCanonicalEvidence(artifactRoot);

    const result = generateHttpTimeoutLifecycleEvidence({ artifactRoot });
    assert.equal(result.manifest.canonicalStepCount, 38);
    assert.deepEqual(
      result.manifest.groups.flatMap((group) => group.steps.map((entry) => entry.checkpoint)),
      expectedCheckpoints
    );
    assert.ok(
      result.manifest.groups
        .flatMap((group) => group.steps)
        .every((entry) => entry.status === (entry.expectedClassification === 'diagnostic' ? 'diagnostic' : 'accepted'))
    );

    assert.deepEqual(result.manifest.summary.testResult, {
      label: 'httpTimeoutLifecycle',
      outcome: 'success',
      total: 3,
      passing: 3,
      failing: 0,
      pending: 0,
      passRate: 100,
      duration: '12m',
    });
    assert.deepEqual(result.manifest.summary.lifecycle.expectedPhaseIds, [
      'runtimeDependencyBootstrap:bootstrap',
      'httpTimeoutLifecycle:create',
      'httpTimeoutLifecycle:reopen',
    ]);
    assert.equal(result.manifest.summary.lifecycle.exactPhaseOrder, true);
    assert.equal(result.manifest.summary.lifecycle.originalProcessClosureVerified, true);
    assert.equal(result.manifest.summary.lifecycle.processClosureProof, 'retained-original-identities');
    assert.equal(result.manifest.summary.lifecycle.cleanupVerified, true);
    assert.equal(result.manifest.summary.lifecycle.complete, true);
    assert.equal(result.manifest.summary.lifecycle.exitCode, 0);
    assert.equal(result.manifest.summary.lifecycle.signal, null);
    assert.equal(result.manifest.summary.identity.sourceSHA, 'a'.repeat(40));
    assert.equal(result.manifest.summary.identity.producerBuildNumber, '20261012.7');
    assert.equal(result.manifest.summary.identity.repositoryUri, 'https://github.com/Azure/LogicAppsUX');
    assert.doesNotMatch(result.markdown, /ignored raw failure excerpt|secret-token/);
    assert.match(result.markdown, /Exact ordered phases<\/td>|Exact ordered phases/);
    assert.match(result.markdown, /retained-original-identities/);
    assert.ok(fs.existsSync(result.markdownPath));
    assert.ok(fs.existsSync(result.manifestPath));
  });
});

test('generator separates sorted diagnostic extras from the required catalog', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot);
    const screenshots = path.join(artifactRoot, 'screenshots');
    writeEvidencePair(screenshots, 'z-retry-2', 'diagnostic', 'diagnostic', ['bounded-retry']);
    writeEvidencePair(path.join(screenshots, 'nested'), 'a-retry-1', 'diagnostic', 'failed', ['capture-timeout']);

    const { manifest, markdown } = generateHttpTimeoutLifecycleEvidence({ artifactRoot });
    assert.deepEqual(
      manifest.diagnosticExtras.map((entry) => entry.checkpoint),
      ['a-retry-1', 'z-retry-2']
    );
    assert.equal(manifest.diagnosticExtras[0].sidecar.verdict, 'failed');
    assert.equal(manifest.diagnosticExtras[1].sidecar.reasonCodes[0], 'bounded-retry');
    assert.match(markdown, /Additional diagnostic screenshots/);
    assert.match(markdown, /cannot replace a required checkpoint/);
  });
});

test('generator visibly renders missing, rejected, invalid, ambiguous, and mismatched evidence', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot, { terminalComplete: false, outcome: 'failure' });
    const screenshots = path.join(artifactRoot, 'screenshots');
    const [missingPng, rejected, invalid, ambiguous, mismatched] = expectedCheckpoints;

    writeSidecar(screenshots, missingPng, 'evidence', 'accepted', ['sidecar-only']);
    writeEvidencePair(screenshots, rejected, 'evidence', 'failed', ['designer-state-missing']);
    writePng(screenshots, invalid);
    fs.writeFileSync(path.join(screenshots, `${invalid}.json`), '{not-json');
    writeEvidencePair(path.join(screenshots, 'one'), ambiguous, 'evidence', 'accepted', ['first']);
    writeEvidencePair(path.join(screenshots, 'two'), ambiguous, 'evidence', 'accepted', ['second']);
    writePng(screenshots, mismatched);
    writeSidecar(screenshots, mismatched, 'evidence', 'accepted', ['renamed'], 'different-checkpoint');

    const { manifest, markdown } = generateHttpTimeoutLifecycleEvidence({ artifactRoot });
    const steps = manifest.groups.flatMap((group) => group.steps);
    assert.equal(steps.find((entry) => entry.checkpoint === missingPng).status, 'missing');
    assert.equal(steps.find((entry) => entry.checkpoint === rejected).status, 'rejected');
    assert.equal(steps.find((entry) => entry.checkpoint === invalid).status, 'invalid-sidecar');
    assert.equal(steps.find((entry) => entry.checkpoint === ambiguous).status, 'ambiguous');
    assert.equal(steps.find((entry) => entry.checkpoint === mismatched).status, 'checkpoint-mismatch');
    assert.match(markdown, /Screenshot PNG is missing/);
    assert.match(markdown, /❌ Rejected/);
    assert.match(markdown, /❌ Invalid sidecar/);
    assert.match(markdown, /⚠ Ambiguous/);
    assert.match(markdown, /❌ Checkpoint mismatch/);
    assert.equal(manifest.summary.lifecycle.complete, false);
    assert.equal(manifest.summary.testResult.outcome, 'failure');
  });
});

test('artifact links stay local, use forward slashes, and encode path segments', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot);
    const checkpoint = expectedCheckpoints[0];
    writeEvidencePair(path.join(artifactRoot, 'screenshots', 'folder with space', 'hash#part'), checkpoint, 'evidence', 'accepted', [
      'ready',
    ]);

    const { manifest } = generateHttpTimeoutLifecycleEvidence({ artifactRoot });
    const first = manifest.groups[0].steps[0];
    assert.equal(first.screenshot.path, `screenshots/folder with space/hash#part/${checkpoint}.png`);
    assert.equal(first.screenshot.link, `screenshots/folder%20with%20space/hash%23part/${checkpoint}.png`);
    assert.ok(!first.screenshot.link.includes('\\'));
    assert.equal(_test.artifactRelativeLink(artifactRoot, path.join(artifactRoot, 'results', 'a b.json')), 'results/a%20b.json');
    assert.equal(_test.artifactRelativeLink(artifactRoot, path.join(artifactRoot, '..', 'outside.json')), undefined);
  }, 'http timeout evidence root ');
});

test('CLI publishes a useful report when all structured inputs and evidence are missing', () => {
  withArtifactFixture((artifactRoot) => {
    const script = path.join(__dirname, 'http-timeout-lifecycle-evidence.js');
    const result = spawnSync(process.execPath, [script, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const markdownPath = path.join(artifactRoot, 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.md');
    const manifestPath = path.join(artifactRoot, 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.json');
    assert.ok(fs.existsSync(markdownPath));
    assert.ok(fs.existsSync(manifestPath));
    const markdown = fs.readFileSync(markdownPath, 'utf8');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.match(markdown, /Native result \| missing/);
    assert.match(markdown, /Screenshot PNG is missing/);
    assert.equal(manifest.canonicalStepCount, 38);
    assert.equal(manifest.summary.inputStatus.result, 'missing');
    assert.equal(manifest.groups[0].steps[0].status, 'missing');
  }, 'http timeout evidence missing ');
});

function withArtifactFixture(callback, prefix = 'http-timeout-evidence-') {
  const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    callback(artifactRoot);
  } finally {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }
}

function assertSourceOrder(source, values) {
  let previousIndex = -1;
  for (const value of values) {
    const index = source.indexOf(value, previousIndex + 1);
    assert.ok(index > previousIndex, `Expected production source to contain ${value} after the prior ordered checkpoint`);
    previousIndex = index;
  }
}

function sourceSection(source, startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start + startText.length);
  assert.ok(start >= 0 && end > start, `Expected production source section ${startText}`);
  return source.slice(start, end);
}

function writeStructuredInputs(artifactRoot, options = {}) {
  const results = path.join(artifactRoot, 'results');
  fs.mkdirSync(results, { recursive: true });
  const phases = ['runtimeDependencyBootstrap:bootstrap', 'httpTimeoutLifecycle:create', 'httpTimeoutLifecycle:reopen'];
  fs.writeFileSync(
    path.join(results, 'httpTimeoutLifecycle.json'),
    `${JSON.stringify(
      {
        label: 'httpTimeoutLifecycle',
        outcome: options.outcome || 'success',
        total: 3,
        passing: options.outcome === 'failure' ? 2 : 3,
        failing: options.outcome === 'failure' ? 1 : 0,
        pending: 0,
        passRate: options.outcome === 'failure' ? 66.67 : 100,
        duration: '12m',
        failureExcerpt: ['ignored raw failure excerpt', 'secret-token'],
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(results, 'httpTimeoutLifecycle.terminal-result.json'),
    `${JSON.stringify(
      {
        suiteId: 'httpTimeoutLifecycle',
        complete: options.terminalComplete !== false,
        lifecycleFinalized: options.terminalComplete !== false,
        exitCode: options.terminalComplete === false ? 1 : 0,
        signal: null,
        cleanupVerified: options.terminalComplete !== false,
        originalProcessClosureVerified: options.terminalComplete !== false,
        processClosureProof: options.terminalComplete === false ? 'original-identities-unverified' : 'retained-original-identities',
        phaseCompleteness: true,
        expectedPhaseIds: phases,
        observedPhaseIds: phases,
        missingPhaseIds: [],
        unexpectedPhaseIds: [],
        duplicatePhaseIds: [],
        blockedPhaseIds: [],
        diagnosticsError: 'raw unrestricted terminal error must not be emitted',
        phaseResults: phases.map((phaseId) => ({
          phaseId,
          complete: true,
          exitCode: 0,
          signal: null,
          cleanupVerified: true,
          diagnosticsError: '',
        })),
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(results, 'admission-context-httpTimeoutLifecycle.json'),
    `${JSON.stringify(
      {
        producerDefinitionId: '731',
        producerRunId: '9921',
        producerBuildNumber: '20261012.7',
        sourceSHA: 'a'.repeat(40),
        checkoutRef: 'refs/heads/main',
        repositoryName: 'Azure/LogicAppsUX',
        repositoryUri: 'https://github.com/Azure/LogicAppsUX?token=secret-token',
        artifactName: 'vscode-e2e-build',
        artifactSHA256: 'b'.repeat(64),
        resolvedVSCodeBuild: '1.140.0',
        unrestricted: 'secret-token',
      },
      null,
      2
    )}\n`
  );
}

function writeCanonicalEvidence(artifactRoot) {
  for (const group of catalogGroups) {
    for (const entry of group.steps) {
      writeEvidencePair(
        path.join(artifactRoot, 'screenshots', group.id),
        entry.checkpoint,
        entry.expectedClassification,
        entry.expectedClassification === 'diagnostic' ? 'diagnostic' : 'accepted',
        ['ready']
      );
    }
  }
}

function writeEvidencePair(directory, checkpoint, classification, verdict, reasonCodes) {
  writePng(directory, checkpoint);
  writeSidecar(directory, checkpoint, classification, verdict, reasonCodes);
}

function writePng(directory, checkpoint) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, `${checkpoint}.png`),
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64')
  );
}

function writeSidecar(directory, checkpoint, classification, verdict, reasonCodes, sidecarCheckpoint = checkpoint) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, `${checkpoint}.json`),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        checkpoint: sidecarCheckpoint,
        phase: 'fixture',
        classification,
        verdict,
        reasonCodes,
      },
      null,
      2
    )}\n`
  );
}
