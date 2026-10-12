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
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const { generateHttpTimeoutLifecycleEvidence } = require('./http-timeout-lifecycle-evidence');
const {
  suiteDescriptors,
  getSuiteDescriptor,
  httpCatalogGroups: catalogGroups,
  generateVscodeE2eEvidenceReport,
  _test,
} = require('./vscode-e2e-evidence-report');

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

test('descriptor IDs exactly match the registered suite IDs', () => {
  assert.deepEqual(Object.keys(suiteDescriptors), Object.keys(SUITE_REGISTRY));
  assert.deepEqual(
    Object.entries(suiteDescriptors).map(([id, descriptor]) => [id, descriptor.id]),
    Object.keys(SUITE_REGISTRY).map((id) => [id, id])
  );
});

test('unknown suites are rejected and report output names are fixed', () => {
  assert.throws(() => getSuiteDescriptor('unknownSuite'), /Unknown suite-id/);
  assert.throws(() => getSuiteDescriptor('__proto__'), /Unknown suite-id/);
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot, { suiteId: 'unitTests', phases: ['unitTests'] });
    const result = generateVscodeE2eEvidenceReport({ artifactRoot, suiteId: 'unitTests' });
    assert.equal(path.basename(result.markdownPath), 'VS_CODE_CLI_EVIDENCE.md');
    assert.equal(path.basename(result.manifestPath), 'VS_CODE_CLI_EVIDENCE.json');
    assert.deepEqual(result.aliasPaths, []);
  });
});

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

test('descriptor modes and production catalog counts stay deterministic', () => {
  const counts = Object.fromEntries(
    Object.keys(SUITE_REGISTRY).map((suiteId) => [
      suiteId,
      getSuiteDescriptor(suiteId)
        .buildCatalog({
          multiRootFinalResult: { status: 'available', value: { observation: { roots: ['C:/one', 'C:/two', 'C:/three'] } } },
        })
        .reduce((total, catalogGroup) => total + catalogGroup.steps.length, 0),
    ])
  );
  assert.deepEqual(counts, {
    unitTests: 1,
    createWorkspaceBehavior: 74,
    createWorkspaceCoreMatrix: 38,
    createWorkspacePreviewMatrix: 34,
    createWorkspaceCodeful: 10,
    createWorkspaceBehaviorSmoke: 42,
    msnWeatherLifecycle: 36,
    httpTimeoutLifecycle: 38,
    statelessVariablesLifecycle: 19,
    workspaceArtifactRegeneration: 25,
    workspaceMultiRoot: 6,
  });
  assert.equal(getSuiteDescriptor('unitTests').mode, 'catalog');
  assert.equal(getSuiteDescriptor('workspaceMultiRoot').mode, 'dynamic-catalog');
});

test('finite and dynamic catalogs preserve their structured contract order', () => {
  assert.deepEqual(
    getSuiteDescriptor('createWorkspaceCoreMatrix')
      .buildCatalog({})
      .flatMap((catalogGroup) => catalogGroup.steps.map((entry) => entry.checkpoint)),
    [
      'create-workspace-standard-stateful-fields-verified-top',
      'create-workspace-standard-stateful-fields-verified-middle',
      'create-workspace-standard-stateful-fields-verified-bottom',
      'create-workspace-standard-stateful-review',
      'create-workspace-standard-stateful-created',
      'create-workspace-standard-stateless-fields-verified-top',
      'create-workspace-standard-stateless-fields-verified-middle',
      'create-workspace-standard-stateless-fields-verified-bottom',
      'create-workspace-standard-stateless-review',
      'create-workspace-standard-stateless-created',
      'create-workspace-custom-code-stateful-fields-verified-top',
      'create-workspace-custom-code-stateful-fields-verified-middle',
      'create-workspace-custom-code-stateful-fields-verified-bottom',
      'create-workspace-custom-code-stateful-fields-verified-function-name',
      'create-workspace-custom-code-stateful-review',
      'create-workspace-custom-code-stateful-created',
      'create-workspace-custom-code-stateless-fields-verified-top',
      'create-workspace-custom-code-stateless-fields-verified-middle',
      'create-workspace-custom-code-stateless-fields-verified-bottom',
      'create-workspace-custom-code-stateless-fields-verified-function-name',
      'create-workspace-custom-code-stateless-review',
      'create-workspace-custom-code-stateless-created',
      'create-workspace-rules-engine-stateful-fields-verified-top',
      'create-workspace-rules-engine-stateful-fields-verified-middle',
      'create-workspace-rules-engine-stateful-fields-verified-bottom',
      'create-workspace-rules-engine-stateful-fields-verified-function-name',
      'create-workspace-rules-engine-stateful-review',
      'create-workspace-rules-engine-stateful-created',
      'create-workspace-rules-engine-stateless-fields-verified-top',
      'create-workspace-rules-engine-stateless-fields-verified-middle',
      'create-workspace-rules-engine-stateless-fields-verified-bottom',
      'create-workspace-rules-engine-stateless-fields-verified-function-name',
      'create-workspace-rules-engine-stateless-review',
      'create-workspace-rules-engine-stateless-created',
      'workspace-prompt-cancel-ui-open-folder',
      'workspace-prompt-cancel-ui-preceding-no',
      'workspace-prompt-cancel-ui-before',
      'workspace-prompt-cancel-ui-after',
    ]
  );
  const regeneration = getSuiteDescriptor('workspaceArtifactRegeneration')
    .buildCatalog({})
    .flatMap((catalogGroup) => catalogGroup.steps.map((entry) => entry.checkpoint));
  assert.equal(regeneration[0], 'workspace-regeneration-baseline');
  assert.deepEqual(regeneration.slice(1, 5), [
    'workspace-regeneration-vscode-single-before-yes',
    'workspace-regeneration-vscode-single-before-overwrite-yes',
    'workspace-regeneration-vscode-single-after-yes',
    'workspace-regeneration-vscode-single-reopened',
  ]);
  assert.equal(regeneration.at(-1), 'workspace-regeneration-root-repeat-reopened');
  assert.deepEqual(
    getSuiteDescriptor('workspaceMultiRoot')
      .buildCatalog({
        multiRootFinalResult: {
          status: 'available',
          value: { observation: { roots: ['D:/owned/zeta', 'D:/owned/alpha', 'D:/owned/middle'] } },
        },
      })
      .flatMap((catalogGroup) => catalogGroup.steps.map((entry) => entry.checkpoint)),
    [
      'workspace-multi-root-created',
      'workspace-multi-root-reloaded',
      'workspace-multi-root-debug-zeta',
      'workspace-multi-root-debug-alpha',
      'workspace-multi-root-debug-middle',
      'workspace-multi-root-mapper',
    ]
  );
});

test('Create Workspace behavior catalogs every accepted production capture in execution order', () => {
  const behavior = getSuiteDescriptor('createWorkspaceBehavior').buildCatalog({});
  assert.deepEqual(
    behavior.map((catalogGroup) => [catalogGroup.id, catalogGroup.steps.length]),
    [
      ['initial-validation', 32],
      ['review-back', 25],
      ['workflow-types', 12],
      ['cleanup', 5],
    ]
  );
  assert.deepEqual(
    behavior[0].steps.slice(0, 6).map((entry) => entry.checkpoint),
    [
      'create-workspace-initial-form-top',
      'create-workspace-initial-form-middle',
      'create-workspace-initial-form-bottom',
      'create-workspace-validation-workspace-parent-folder-path-rejects-non-existent-paths-invalid',
      'create-workspace-validation-workspace-parent-folder-path-is-required-empty',
      'create-workspace-validation-workspace-name-starts-with-number-invalid',
    ]
  );
  assert.deepEqual(
    behavior[1].steps.slice(0, 7).map((entry) => entry.checkpoint),
    [
      'create-workspace-review-standard-fields-verified-top',
      'create-workspace-review-standard-fields-verified-middle',
      'create-workspace-review-standard-fields-verified-bottom',
      'create-workspace-review-standard-review-before-back',
      'create-workspace-review-standard-review-back-top',
      'create-workspace-review-standard-review-back-middle',
      'create-workspace-review-standard-review-back-bottom',
    ]
  );
  assert.deepEqual(
    behavior[3].steps.map((entry) => entry.checkpoint),
    [
      'create-workspace-cleanup-custom-code-fields-verified-top',
      'create-workspace-cleanup-custom-code-fields-verified-middle',
      'create-workspace-cleanup-custom-code-fields-verified-bottom',
      'create-workspace-cleanup-custom-code-fields-verified-function-name',
      'create-workspace-app-type-cleanup',
    ]
  );
  assert.equal(
    getSuiteDescriptor('createWorkspaceBehaviorSmoke')
      .buildCatalog({})
      .flatMap((group) => group.steps).length,
    42
  );
});

test('MSN Weather catalogs loading transitions before the settled action results', () => {
  const runtime = getSuiteDescriptor('msnWeatherLifecycle')
    .buildCatalog({})
    .find((catalogGroup) => catalogGroup.id === 'runtime');
  assert.ok(runtime);
  const checkpoints = runtime.steps.map((entry) => entry.checkpoint);
  assert.ok(
    checkpoints.indexOf('workspace-lifecycle-standard-msn-weather-result-opened-loading') <
      checkpoints.indexOf('workspace-lifecycle-standard-msn-weather-result-opened')
  );
  assert.ok(
    checkpoints.indexOf('workspace-lifecycle-standard-response-result-opened-loading') <
      checkpoints.indexOf('workspace-lifecycle-standard-response-result-opened')
  );
  assert.equal(
    runtime.steps.find((entry) => entry.checkpoint.endsWith('msn-weather-result-opened-loading')).expectedClassification,
    'diagnostic'
  );
});

test('unitTests correlates the required startup screenshot', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot, { suiteId: 'unitTests', phases: ['unitTests'] });
    writeEvidencePair(path.join(artifactRoot, 'screenshots'), 'empty-window-startup', 'evidence', 'accepted', ['workbench-shell-visible']);
    const { manifest, markdown } = generateVscodeE2eEvidenceReport({ artifactRoot, suiteId: 'unitTests' });
    assert.equal(manifest.canonicalStepCount, 1);
    assert.equal(manifest.groups[0].steps[0].checkpoint, 'empty-window-startup');
    assert.equal(manifest.groups[0].steps[0].status, 'accepted');
    assert.equal(manifest.mode, 'catalog');
    assert.match(markdown, /Workbench startup/);
  });
});

test('HTTP compatibility wrapper preserves historical outputs and manifest shape', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot);
    writeCanonicalEvidence(artifactRoot);
    const result = generateHttpTimeoutLifecycleEvidence({ artifactRoot });
    assert.equal(path.basename(result.markdownPath), 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.md');
    assert.equal(path.basename(result.manifestPath), 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.json');
    assert.equal(path.basename(result.genericMarkdownPath), 'VS_CODE_CLI_EVIDENCE.md');
    assert.equal(path.basename(result.genericManifestPath), 'VS_CODE_CLI_EVIDENCE.json');
    assert.equal(Array.isArray(result.manifest.sourceFiles.screenshots), false);
    assert.equal(result.manifest.sourceFiles.screenshots.path, 'screenshots');
    assert.equal(result.manifest.report, 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.md');
    assert.equal(Object.hasOwn(result.manifest, 'manifest'), false);
    assert.equal(Object.hasOwn(result.manifest, 'dynamicCatalog'), false);
    assert.match(
      result.markdown,
      /^# HTTP Timeout Lifecycle Evidence\n\n> This report is an explanatory correlation of staged structured results and screenshot evidence\. The existing strict lifecycle acceptance remains authoritative\./
    );
    assert.match(result.markdown, /^#### 01\. create workspace form ready$/m);
    assert.match(result.markdown, /^\[!\[01\. create workspace form ready\]\(/m);
    assert.doesNotMatch(result.markdown, /\*\*Suite ID:\*\*|\*\*Descriptor mode:\*\*/);
    assert.match(result.markdown, /\| Screenshots \| available \| \[Open\]\(screenshots\) \|/);
  });
});

test('HTTP compatibility summary preserves historical missing-phase behavior', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot);
    const terminalPath = path.join(artifactRoot, 'results', 'httpTimeoutLifecycle.terminal-result.json');
    const terminal = JSON.parse(fs.readFileSync(terminalPath, 'utf8'));
    delete terminal.expectedPhaseIds;
    delete terminal.observedPhaseIds;
    fs.writeFileSync(terminalPath, `${JSON.stringify(terminal, null, 2)}\n`);

    const result = generateVscodeE2eEvidenceReport({ artifactRoot, suiteId: 'httpTimeoutLifecycle' });
    assert.deepEqual(result.manifest.summary.lifecycle.expectedPhaseIds, SUITE_REGISTRY.httpTimeoutLifecycle.expectedPhases);
    assert.deepEqual(result.manifest.summary.lifecycle.observedPhaseIds, SUITE_REGISTRY.httpTimeoutLifecycle.expectedPhases);
    assert.deepEqual(result.compatibility.manifest.summary.lifecycle.expectedPhaseIds, []);
    assert.deepEqual(result.compatibility.manifest.summary.lifecycle.observedPhaseIds, []);
    assert.equal(result.compatibility.manifest.summary.lifecycle.exactPhaseOrder, false);
  });
});

test('terminal normalization supports family fields and direct phaseResults fallback', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot, { suiteId: 'msnWeatherLifecycle', phases: SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases });
    const terminalPath = path.join(artifactRoot, 'results', 'msnWeatherLifecycle.terminal-result.json');
    const terminal = JSON.parse(fs.readFileSync(terminalPath, 'utf8'));
    delete terminal.expectedPhaseIds;
    delete terminal.observedPhaseIds;
    fs.writeFileSync(terminalPath, `${JSON.stringify(terminal, null, 2)}\n`);
    const direct = generateVscodeE2eEvidenceReport({ artifactRoot, suiteId: 'msnWeatherLifecycle' }).manifest.summary.lifecycle;
    assert.deepEqual(direct.expectedPhaseIds, SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases);
    assert.deepEqual(direct.observedPhaseIds, SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases);

    terminal.expectedPhases = ['direct:a', 'direct:b'];
    terminal.observedPhases = ['direct:a', 'direct:b'];
    terminal.phaseResults = [];
    fs.writeFileSync(terminalPath, `${JSON.stringify(terminal, null, 2)}\n`);
    const alternate = generateVscodeE2eEvidenceReport({ artifactRoot, suiteId: 'msnWeatherLifecycle' }).manifest.summary.lifecycle;
    assert.deepEqual(alternate.expectedPhaseIds, ['direct:a', 'direct:b']);
    assert.deepEqual(alternate.observedPhaseIds, ['direct:a', 'direct:b']);
  });
});

test('multi-root report uses ordered root basenames without publishing runtime roots', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot, {
      suiteId: 'workspaceMultiRoot',
      phases: SUITE_REGISTRY.workspaceMultiRoot.expectedPhases,
    });
    const finalResultPath = path.join(artifactRoot, 'workspace-multi-root', 'final-result.json');
    fs.mkdirSync(path.dirname(finalResultPath), { recursive: true });
    fs.writeFileSync(
      finalResultPath,
      `${JSON.stringify({ observation: { roots: ['D:\\private\\zeta', 'D:\\private\\alpha'] } }, null, 2)}\n`
    );
    const { manifest, markdown } = generateVscodeE2eEvidenceReport({ artifactRoot, suiteId: 'workspaceMultiRoot' });
    assert.deepEqual(
      manifest.groups[0].steps.map((entry) => entry.checkpoint),
      [
        'workspace-multi-root-created',
        'workspace-multi-root-reloaded',
        'workspace-multi-root-debug-zeta',
        'workspace-multi-root-debug-alpha',
        'workspace-multi-root-mapper',
      ]
    );
    assert.doesNotMatch(JSON.stringify(manifest), /D:\\\\private/);
    assert.doesNotMatch(markdown, /D:\\private/);
  });
});

test('multi-root report visibly explains a missing dynamic catalog input', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot, {
      suiteId: 'workspaceMultiRoot',
      phases: SUITE_REGISTRY.workspaceMultiRoot.expectedPhases,
    });
    const { manifest, markdown } = generateVscodeE2eEvidenceReport({
      artifactRoot,
      suiteId: 'workspaceMultiRoot',
    });
    assert.equal(manifest.canonicalStepCount, 3);
    assert.match(markdown, /Multi-root final result \| missing/);
    assert.match(markdown, /per-root checkpoint identities cannot be constructed without guessing/);
  });
});

test('regeneration report retains the fixed catalog when runtime plannedCases are malformed', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot, {
      suiteId: 'workspaceArtifactRegeneration',
      phases: SUITE_REGISTRY.workspaceArtifactRegeneration.expectedPhases,
    });
    const finalResultPath = path.join(artifactRoot, 'log', 'regeneration', 'final-result.json');
    fs.mkdirSync(path.dirname(finalResultPath), { recursive: true });
    fs.writeFileSync(finalResultPath, `${JSON.stringify({ plannedCases: ['unexpected-case'] }, null, 2)}\n`);
    const { manifest, markdown } = generateVscodeE2eEvidenceReport({
      artifactRoot,
      suiteId: 'workspaceArtifactRegeneration',
    });
    assert.equal(manifest.canonicalStepCount, 25);
    assert.match(markdown, /plannedCases differ from the production contract/);
    assert.match(markdown, /strict native\/terminal acceptance remains authoritative/);
  });
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
    assert.doesNotMatch(
      JSON.stringify(result.manifest),
      /must-not-publish-(?:target-id|frame-id|arbitrary-details|credential)|private[\\/]runtime-root/
    );
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

test('generator visibly renders missing, rejected, invalid, ambiguous, mismatched, and disabled evidence', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot, { terminalComplete: false, outcome: 'failure' });
    const screenshots = path.join(artifactRoot, 'screenshots');
    const [missingPng, rejected, invalid, ambiguous, mismatched, disabled] = expectedCheckpoints;

    writeSidecar(screenshots, missingPng, 'evidence', 'accepted', ['sidecar-only']);
    writeEvidencePair(screenshots, rejected, 'evidence', 'failed', ['designer-state-missing']);
    writePng(screenshots, invalid);
    fs.writeFileSync(path.join(screenshots, `${invalid}.json`), '{not-json');
    writeEvidencePair(path.join(screenshots, 'one'), ambiguous, 'evidence', 'accepted', ['first']);
    writeEvidencePair(path.join(screenshots, 'two'), ambiguous, 'evidence', 'accepted', ['second']);
    writePng(screenshots, mismatched);
    writeSidecar(screenshots, mismatched, 'evidence', 'accepted', ['renamed'], 'different-checkpoint');
    writeSidecar(screenshots, disabled, 'evidence', 'disabled', ['capture-disabled']);

    const { manifest, markdown } = generateHttpTimeoutLifecycleEvidence({ artifactRoot });
    const steps = manifest.groups.flatMap((group) => group.steps);
    assert.equal(steps.find((entry) => entry.checkpoint === missingPng).status, 'missing');
    assert.equal(steps.find((entry) => entry.checkpoint === rejected).status, 'rejected');
    assert.equal(steps.find((entry) => entry.checkpoint === invalid).status, 'invalid-sidecar');
    assert.equal(steps.find((entry) => entry.checkpoint === ambiguous).status, 'ambiguous');
    assert.equal(steps.find((entry) => entry.checkpoint === mismatched).status, 'checkpoint-mismatch');
    assert.equal(steps.find((entry) => entry.checkpoint === disabled).status, 'disabled');
    assert.match(markdown, /Screenshot PNG is missing/);
    assert.match(markdown, /❌ Rejected/);
    assert.match(markdown, /❌ Invalid sidecar/);
    assert.match(markdown, /⚠ Ambiguous/);
    assert.match(markdown, /❌ Checkpoint mismatch/);
    assert.match(markdown, /ℹ Disabled/);
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
    assert.throws(
      () =>
        generateVscodeE2eEvidenceReport({
          artifactRoot,
          suiteId: 'unitTests',
          screenshotsDir: path.join(artifactRoot, '..', 'outside-screenshots'),
        }),
      /must stay inside artifactRoot/
    );
  }, 'http timeout evidence root ');
});

test('catalog order is independent of screenshot file enumeration order', () => {
  withArtifactFixture((artifactRoot) => {
    writeStructuredInputs(artifactRoot, {
      suiteId: 'createWorkspaceCoreMatrix',
      phases: SUITE_REGISTRY.createWorkspaceCoreMatrix.expectedPhases,
    });
    const checkpoints = getSuiteDescriptor('createWorkspaceCoreMatrix')
      .buildCatalog({})
      .flatMap((catalogGroup) => catalogGroup.steps.map((entry) => entry.checkpoint));
    for (const checkpoint of [...checkpoints].reverse()) {
      writeEvidencePair(path.join(artifactRoot, 'screenshots'), checkpoint, 'evidence', 'accepted', ['ready']);
    }
    const { manifest } = generateVscodeE2eEvidenceReport({ artifactRoot, suiteId: 'createWorkspaceCoreMatrix' });
    assert.deepEqual(
      manifest.groups.flatMap((catalogGroup) => catalogGroup.steps.map((entry) => entry.checkpoint)),
      checkpoints
    );
  });
});

test('CLI publishes a useful report when all structured inputs and evidence are missing', () => {
  withArtifactFixture((artifactRoot) => {
    const script = path.join(__dirname, 'vscode-e2e-evidence-report.js');
    const result = spawnSync(process.execPath, [script, '--suite-id', 'httpTimeoutLifecycle', '--artifact-root', artifactRoot], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const markdownPath = path.join(artifactRoot, 'VS_CODE_CLI_EVIDENCE.md');
    const manifestPath = path.join(artifactRoot, 'VS_CODE_CLI_EVIDENCE.json');
    assert.ok(fs.existsSync(markdownPath));
    assert.ok(fs.existsSync(manifestPath));
    assert.ok(fs.existsSync(path.join(artifactRoot, 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.md')));
    assert.ok(fs.existsSync(path.join(artifactRoot, 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.json')));
    const markdown = fs.readFileSync(markdownPath, 'utf8');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.match(markdown, /Native result \| missing/);
    assert.match(markdown, /Screenshot PNG is missing/);
    assert.equal(manifest.canonicalStepCount, 38);
    assert.equal(manifest.summary.inputStatus.result, 'missing');
    assert.equal(manifest.groups[0].steps[0].status, 'missing');
  }, 'http timeout evidence missing ');
});

test('HTTP compatibility CLI reports the historical filenames', () => {
  withArtifactFixture((artifactRoot) => {
    const script = path.join(__dirname, 'http-timeout-lifecycle-evidence.js');
    const result = spawnSync(process.execPath, [script, '--artifact-root', artifactRoot], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /HTTP_TIMEOUT_LIFECYCLE_EVIDENCE\.md and HTTP_TIMEOUT_LIFECYCLE_EVIDENCE\.json/);
  }, 'http timeout compatibility cli ');
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
  const suiteId = options.suiteId || 'httpTimeoutLifecycle';
  const phases = options.phases || ['runtimeDependencyBootstrap:bootstrap', 'httpTimeoutLifecycle:create', 'httpTimeoutLifecycle:reopen'];
  fs.writeFileSync(
    path.join(results, `${suiteId}.json`),
    `${JSON.stringify(
      {
        label: suiteId,
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
    path.join(results, `${suiteId}.terminal-result.json`),
    `${JSON.stringify(
      {
        suiteId,
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
    path.join(results, `admission-context-${suiteId}.json`),
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
        target: { opaqueTargetId: 'must-not-publish-target-id', opaqueFrameId: 'must-not-publish-frame-id' },
        details: { raw: 'must-not-publish-arbitrary-details' },
        absoluteRuntimeRoot: 'D:\\private\\runtime-root',
        credential: 'must-not-publish-credential',
      },
      null,
      2
    )}\n`
  );
}
