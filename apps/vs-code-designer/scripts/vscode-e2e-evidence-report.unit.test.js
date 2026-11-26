/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global Buffer, require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const {
  declareMultiRootEvidenceCheckpoints,
  finalizeEvidenceManifest,
  initializeSuiteEvidenceManifest,
  manifestFileName,
  readEvidenceManifest,
  recordScreenshotMetadata,
  validateEvidenceManifest,
} = require('./vscode-e2e-evidence-manifest');
const { getSuiteDescriptor, httpCatalogGroups, suiteDescriptors } = require('./vscode-e2e-evidence-plans');
const { generateVscodeE2eEvidenceReport, _test: evidenceReportTest } = require('./vscode-e2e-evidence-report');
const { stageVscodeE2eEvidence, validationFileName } = require('./stage-vscode-e2e-evidence');

const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');

test('producer plan IDs exactly match the registered suite IDs', () => {
  assert.deepEqual(Object.keys(suiteDescriptors), Object.keys(SUITE_REGISTRY));
  assert.throws(() => getSuiteDescriptor('unknownSuite'), /Unknown suite-id/);
});

test('inline code escaping handles backslashes before backticks', () => {
  assert.equal(evidenceReportTest.escapeInlineCode('C:\\temp\\`evidence`'), 'C:\\\\temp\\\\\\`evidence\\`');
});

test('HTML escaping neutralizes active markup', () => {
  assert.equal(
    evidenceReportTest.escapeHtml('<script src="https://example.test">&'),
    '&lt;script src=&quot;https://example.test&quot;&gt;&amp;'
  );
});

test('producer plans preserve the expected finite checkpoint counts', () => {
  const counts = Object.fromEntries(
    Object.keys(SUITE_REGISTRY).map((suiteId) => [
      suiteId,
      getSuiteDescriptor(suiteId)
        .buildCatalog({})
        .reduce((total, group) => total + group.steps.length, 0),
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
    httpTimeoutLifecycle: 40,
    statelessVariablesLifecycle: 25,
    runAfterPersistenceLifecycle: 35,
    workspaceArtifactRegeneration: 19,
    workspaceMultiRoot: 3,
  });
  assert.equal(httpCatalogGroups.flatMap((group) => group.steps).length, 40);
});

test('core matrix places Cancel evidence immediately after Standard Stateful', () => {
  const checkpointIds = getSuiteDescriptor('createWorkspaceCoreMatrix')
    .buildCatalog({})
    .flatMap((group) => group.steps.map((step) => step.checkpoint));
  const statefulCreated = checkpointIds.indexOf('create-workspace-standard-stateful-created');
  const cancelStart = checkpointIds.indexOf('workspace-prompt-cancel-ui-open-folder');
  const cancelEnd = checkpointIds.indexOf('workspace-prompt-cancel-ui-after');
  const statelessStart = checkpointIds.indexOf('create-workspace-standard-stateless-fields-verified-top');
  assert.ok(statefulCreated >= 0);
  assert.equal(cancelStart, statefulCreated + 1);
  assert.equal(cancelEnd, cancelStart + 3);
  assert.equal(statelessStart, cancelEnd + 1);
});

test('manifest initialization assigns stable producer ordinals without filesystem identities', () => {
  withFixture(({ evidenceDir, manifestPath }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'workspaceMultiRoot',
      invocation: 'multi-root-unit',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: SUITE_REGISTRY.workspaceMultiRoot.expectedPhases,
    });
    declareMultiRootEvidenceCheckpoints({
      manifestPath,
      rootLabels: ['alpha', 'zeta', 'omega'],
      expectedInvocation: 'multi-root-unit',
    });
    const manifest = readEvidenceManifest(manifestPath);
    assert.equal(manifest.planState, 'complete');
    assert.deepEqual(
      manifest.groups.flatMap((group) => group.checkpoints.map((checkpoint) => checkpoint.id)),
      [
        'workspace-multi-root-created',
        'workspace-multi-root-reloaded',
        'workspace-multi-root-debug-root-01',
        'workspace-multi-root-debug-root-02',
        'workspace-multi-root-debug-root-03',
        'workspace-multi-root-mapper',
      ]
    );
    assert.deepEqual(manifest.groups.flatMap((group) => group.checkpoints.map((checkpoint) => checkpoint.displayLabel)).filter(Boolean), [
      'alpha',
      'zeta',
      'omega',
    ]);
    assert.throws(
      () =>
        declareMultiRootEvidenceCheckpoints({
          manifestPath,
          rootLabels: ['C:\\private\\alpha'],
          expectedInvocation: 'multi-root-unit',
        }),
      /different ordered labels|must not contain a path/
    );
  });
});

test('manifest initialization removes legacy and compact evidence folders', () => {
  withFixture(({ evidenceDir }) => {
    for (const relativeDirectory of ['e', 'd', 'screenshots', 'diagnostics']) {
      fs.mkdirSync(path.join(evidenceDir, relativeDirectory), { recursive: true });
      fs.writeFileSync(path.join(evidenceDir, relativeDirectory, 'stale.txt'), 'stale');
    }
    initializeSuiteEvidenceManifest({
      suiteId: 'unitTests',
      invocation: 'cleanup-folders',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: ['unitTests'],
    });
    for (const relativeDirectory of ['e', 'd', 'screenshots', 'diagnostics']) {
      assert.ok(!fs.existsSync(path.join(evidenceDir, relativeDirectory, 'stale.txt')));
    }
  });
});

test('dynamic multi-root checkpoints reject ordinal renumbering after evidence starts', () => {
  withFixture(({ root, evidenceDir, manifestPath }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'workspaceMultiRoot',
      invocation: 'multi-root-started',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: SUITE_REGISTRY.workspaceMultiRoot.expectedPhases,
    });
    writeCapture({
      root,
      manifestPath,
      checkpoint: 'workspace-multi-root-created',
      classification: 'evidence',
      verdict: 'accepted',
    });
    assert.throws(
      () =>
        declareMultiRootEvidenceCheckpoints({
          manifestPath,
          rootLabels: ['alpha'],
          expectedInvocation: 'multi-root-started',
        }),
      /before any evidence is recorded/
    );
  });
});

test('failed dynamic suites preserve the unexpanded plan as not reached', () => {
  withFixture(({ evidenceDir, manifestPath, artifactRoot }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'workspaceMultiRoot',
      invocation: 'multi-root-early-failure',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: SUITE_REGISTRY.workspaceMultiRoot.expectedPhases,
    });
    const outcomeFile = writeStructuredInputs(artifactRoot, 'workspaceMultiRoot', 'failure');
    stageVscodeE2eEvidence({ manifestPath, artifactRoot, outcomeFile });
    const manifest = readEvidenceManifest(path.join(artifactRoot, manifestFileName));
    assert.equal(manifest.state, 'failed');
    assert.equal(manifest.planState, 'expandable');
    assert.equal(manifest.finalization.planComplete, false);
    assert.ok(manifest.groups.flatMap((group) => group.checkpoints).every((checkpoint) => checkpoint.status === 'not-reached'));
    const report = generateVscodeE2eEvidenceReport({
      suiteId: 'workspaceMultiRoot',
      artifactRoot,
      evidenceManifest: path.join(artifactRoot, manifestFileName),
    });
    assert.match(report.html, /Not reached/);
    assert.doesNotMatch(report.html, /<img\b/);
  });
});

test('shared writer enforces declared order and records only public sidecars', () => {
  withFixture(({ root, evidenceDir, manifestPath }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'unitTests',
      invocation: 'unit-writer',
      platform: 'win32',
      evidenceDir,
      expectedPhaseIds: ['unitTests'],
    });
    assert.throws(
      () =>
        writeCapture({
          root,
          manifestPath,
          checkpoint: 'undeclared-evidence',
          classification: 'evidence',
          verdict: 'accepted',
        }),
      /not declared/
    );
    writeCapture({
      root,
      manifestPath,
      checkpoint: 'empty-window-startup',
      classification: 'evidence',
      verdict: 'accepted',
      privateFields: {
        target: { opaqueTargetId: 'private-target' },
        events: [{ name: 'private-event' }],
      },
    });
    finalizeEvidenceManifest({ manifestPath, state: 'complete', expectedInvocation: 'unit-writer' });
    const manifest = readEvidenceManifest(manifestPath);
    const checkpoint = manifest.groups[0].checkpoints[0];
    assert.equal(checkpoint.status, 'accepted');
    assert.equal(checkpoint.evidence.screenshot.path, 'e/001.png');
    assert.equal(checkpoint.evidence.sidecar.path, 'e/001.json');
    const sidecar = JSON.parse(fs.readFileSync(path.join(evidenceDir, checkpoint.evidence.sidecar.path), 'utf8'));
    assert.deepEqual(Object.keys(sidecar), ['schemaVersion', 'checkpoint', 'phase', 'classification', 'verdict', 'reasonCodes', 'events']);
    assert.deepEqual(sidecar.events, []);
    assert.doesNotMatch(JSON.stringify(sidecar), /private-target|private-event/);
  });
});

test('evidence and diagnostic sidecars preserve only allowlisted capture comparison fields', () => {
  withFixture(({ root, evidenceDir, manifestPath }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'unitTests',
      invocation: 'unit-capture-summary',
      platform: 'win32',
      evidenceDir,
      expectedPhaseIds: ['unitTests'],
    });
    const privateFields = {
      timing: { timeoutMs: 15000, elapsedMs: 14999, samples: 60, captureAttempts: 2, secret: 'private-value' },
      target: { opaqueTargetId: 'private-target' },
      geometry: {
        viewport: { width: 1024, height: 768, deviceScaleFactor: 1.25, secret: 'private-value' },
        anchors: [{ name: 'designerCanvas', bounds: { left: 0, top: 32, width: 710, height: 736 } }, { name: 'private-anchor' }],
      },
      counts: { loaders: 0, canvasNodes: 2, secret: 123 },
      events: [
        { name: 'private-event' },
        {
          name: 'rejected',
          elapsedMs: 100,
          generation: 2,
          revision: 5,
          structuralRevision: 4,
          ownerRevision: 3,
          counts: { loaders: 0, canvasNodes: 2, secret: 123 },
          details: {
            preCaptureRevision: 4,
            postCaptureRevision: 5,
            revisionAccepted: false,
            ownerRevisionAccepted: true,
            preOwnerRevision: 'private-value',
            secret: 'private-value',
          },
        },
      ],
    };
    for (const [checkpoint, classification, verdict] of [
      ['empty-window-startup', 'evidence', 'failed'],
      ['capture-failure-diagnostic', 'diagnostic', 'diagnostic'],
    ]) {
      writeCapture({ root, manifestPath, checkpoint, classification, verdict, privateFields });
      const manifest = readEvidenceManifest(manifestPath);
      const reference =
        classification === 'evidence'
          ? manifest.groups.flatMap((group) => group.checkpoints).find((entry) => entry.id === checkpoint).evidence.sidecar
          : manifest.attachments.find((entry) => entry.id === checkpoint).evidence.sidecar;
      const sidecar = JSON.parse(fs.readFileSync(path.join(evidenceDir, reference.path), 'utf8'));
      assert.equal(sidecar.timing.captureAttempts, 2);
      assert.deepEqual(sidecar.geometry.viewport, { width: 1024, height: 768, deviceScaleFactor: 1.25 });
      assert.deepEqual(sidecar.counts, { loaders: 0, canvasNodes: 2 });
      assert.equal(sidecar.events.length, 1);
      assert.equal(sidecar.events[0].revision, 5);
      assert.deepEqual(sidecar.events[0].details, {
        preCaptureRevision: 4,
        postCaptureRevision: 5,
        ownerRevisionAccepted: true,
        revisionAccepted: false,
      });
      assert.doesNotMatch(JSON.stringify(sidecar), /private-|secret/);
    }
  });
});

test('manifest mutations reject writers from a stale invocation', () => {
  withFixture(({ root, evidenceDir, manifestPath }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'unitTests',
      invocation: 'old-invocation',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: ['unitTests'],
    });
    initializeSuiteEvidenceManifest({
      suiteId: 'unitTests',
      invocation: 'new-invocation',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: ['unitTests'],
    });
    assert.throws(
      () =>
        writeCapture({
          root,
          manifestPath,
          checkpoint: 'empty-window-startup',
          classification: 'evidence',
          verdict: 'accepted',
          expectedInvocation: 'old-invocation',
        }),
      /invocation changed/
    );
    assert.equal(readEvidenceManifest(manifestPath).groups[0].checkpoints[0].status, 'pending');
  });
});

test('failed suites retain accepted evidence and mark unfinished checkpoints not reached', () => {
  withFixture(({ root, evidenceDir, manifestPath }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'httpTimeoutLifecycle',
      invocation: 'http-failed',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: SUITE_REGISTRY.httpTimeoutLifecycle.expectedPhases,
    });
    const firstCheckpoint = httpCatalogGroups[0].steps[0].checkpoint;
    writeCapture({
      root,
      manifestPath,
      checkpoint: firstCheckpoint,
      classification: 'evidence',
      verdict: 'accepted',
    });
    finalizeEvidenceManifest({
      manifestPath,
      state: 'failed',
      reason: 'fixture failure',
      expectedInvocation: 'http-failed',
    });
    const manifest = readEvidenceManifest(manifestPath);
    const checkpoints = manifest.groups.flatMap((group) => group.checkpoints);
    assert.equal(checkpoints[0].status, 'accepted');
    assert.ok(checkpoints.slice(1).every((checkpoint) => checkpoint.status === 'not-reached'));
  });
});

test('manifest staging copies only referenced files and renderer consumes the staged manifest', () => {
  withFixture(({ root, evidenceDir, manifestPath, artifactRoot }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'unitTests',
      invocation: 'unit-stage',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: ['unitTests'],
    });
    writeCapture({
      root,
      manifestPath,
      checkpoint: 'empty-window-startup',
      classification: 'evidence',
      verdict: 'accepted',
    });
    fs.writeFileSync(path.join(evidenceDir, 'unreferenced-secret.txt'), 'must not be copied');
    const resultPath = writeStructuredInputs(artifactRoot, 'unitTests', 'success');
    const staged = stageVscodeE2eEvidence({
      manifestPath,
      artifactRoot,
      outcomeFile: resultPath,
    });
    assert.equal(staged.validation.valid, true);
    assert.ok(fs.existsSync(path.join(artifactRoot, manifestFileName)));
    assert.ok(fs.existsSync(path.join(artifactRoot, validationFileName)));
    assert.ok(!fs.existsSync(path.join(artifactRoot, 'unreferenced-secret.txt')));
    const report = generateVscodeE2eEvidenceReport({
      suiteId: 'unitTests',
      artifactRoot,
      evidenceManifest: path.join(artifactRoot, manifestFileName),
    });
    assert.equal(report.manifest.canonicalStepCount, 1);
    assert.equal(report.manifest.groups[0].steps[0].status, 'accepted');
    assert.match(report.markdown, /Producer evidence manifest/);
    assert.equal(report.manifest.selfContainedReport, 'evidence.html');
    assert.ok(fs.existsSync(report.htmlPath));
    assert.match(report.html, /default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'/);
    assert.match(report.html, /src="data:image\/png;base64,/);
    assert.doesNotMatch(report.html, /<script\b|src="https?:/);
    const hostileManifest = JSON.parse(JSON.stringify(report.manifest));
    hostileManifest.groups[0].title = '<script src="https://example.test">';
    hostileManifest.groups[0].steps[0].action = '<img src=x onerror=alert(1)>';
    const hostileHtml = evidenceReportTest.buildHtml(hostileManifest, artifactRoot);
    assert.match(hostileHtml, /&lt;script src=&quot;https:\/\/example\.test&quot;&gt;/);
    assert.match(hostileHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(hostileHtml, /<script\b|<img src=x/);
    assert.throws(() => evidenceReportTest.buildHtml(report.manifest, artifactRoot, 10), /too large/);
    const fallback = generateVscodeE2eEvidenceReport({
      suiteId: 'unitTests',
      artifactRoot,
      evidenceManifest: path.join(artifactRoot, manifestFileName),
      maxHtmlBytes: 10,
    });
    assert.deepEqual(fallback.manifest.selfContainedReportStatus, { images: 'omitted', reason: 'report-size-limit' });
    assert.match(fallback.html, /Embedded images omitted/);
    assert.doesNotMatch(fallback.html, /<img\b/);
    const missingManifest = JSON.parse(JSON.stringify(report.manifest));
    missingManifest.groups[0].steps[0].screenshot = { status: 'missing' };
    const missingHtml = evidenceReportTest.buildHtml(missingManifest, artifactRoot);
    assert.match(missingHtml, /Screenshot unavailable \(missing\)/);
    assert.doesNotMatch(missingHtml, /<img\b/);
    const screenshotPath = path.join(artifactRoot, report.manifest.groups[0].steps[0].screenshot.path);
    fs.appendFileSync(screenshotPath, 'tamper');
    assert.throws(() => evidenceReportTest.buildHtml(report.manifest, artifactRoot), /integrity mismatch/);
    const tampered = generateVscodeE2eEvidenceReport({
      suiteId: 'unitTests',
      artifactRoot,
      evidenceManifest: path.join(artifactRoot, manifestFileName),
    });
    assert.deepEqual(tampered.manifest.selfContainedReportStatus, {
      images: 'omitted',
      reason: 'image-integrity-unavailable',
    });
    assert.match(tampered.html, /Embedded images omitted/);
  });
});

test('HTTP compatibility aliases derive from the canonical producer manifest', () => {
  withFixture(({ root, evidenceDir, manifestPath, artifactRoot }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'httpTimeoutLifecycle',
      invocation: 'http-complete',
      platform: 'win32',
      evidenceDir,
      expectedPhaseIds: SUITE_REGISTRY.httpTimeoutLifecycle.expectedPhases,
    });
    const manifest = readEvidenceManifest(manifestPath);
    for (const checkpoint of manifest.groups.flatMap((group) => group.checkpoints)) {
      writeCapture({
        root,
        manifestPath,
        checkpoint: checkpoint.id,
        classification: checkpoint.classification,
        verdict: checkpoint.classification === 'diagnostic' ? 'diagnostic' : 'accepted',
      });
    }
    const resultPath = writeStructuredInputs(artifactRoot, 'httpTimeoutLifecycle', 'success');
    stageVscodeE2eEvidence({ manifestPath, artifactRoot, outcomeFile: resultPath });
    const report = generateVscodeE2eEvidenceReport({
      suiteId: 'httpTimeoutLifecycle',
      artifactRoot,
      evidenceManifest: path.join(artifactRoot, manifestFileName),
    });
    assert.ok(report.compatibility);
    assert.equal(report.compatibility.manifest.canonicalStepCount, 40);
    assert.deepEqual(
      report.compatibility.manifest.groups.flatMap((group) => group.steps.map((step) => step.checkpoint)),
      httpCatalogGroups.flatMap((group) => group.steps.map((step) => step.checkpoint))
    );
  });
});

test('Stateless click-time diagnostics are staged as producer attachments without requiring a retry', () => {
  for (const attempts of [1, 2]) {
    withFixture(({ root, evidenceDir, manifestPath, artifactRoot }) => {
      initializeSuiteEvidenceManifest({
        suiteId: 'statelessVariablesLifecycle',
        invocation: 'stateless-click-boundary',
        platform: 'win32',
        evidenceDir,
        expectedPhaseIds: SUITE_REGISTRY.statelessVariablesLifecycle.expectedPhases,
      });
      for (const checkpoint of readEvidenceManifest(manifestPath).groups.flatMap((group) => group.checkpoints)) {
        writeCapture({
          root,
          manifestPath,
          checkpoint: checkpoint.id,
          classification: checkpoint.classification,
          verdict: checkpoint.classification === 'diagnostic' ? 'diagnostic' : 'accepted',
        });
        if (checkpoint.id === 'stateless-variables-request-trigger-added') {
          break;
        }
      }
      for (let attempt = 1; attempt <= attempts; attempt++) {
        for (const stage of ['before', 'after']) {
          writeCapture({
            root,
            manifestPath,
            checkpoint: `stateless-variables-initialize-click-${attempt}-${stage}`,
            classification: 'diagnostic',
            verdict: 'diagnostic',
          });
        }
      }
      const outcomeFile = writeStructuredInputs(artifactRoot, 'statelessVariablesLifecycle', 'failure');
      const staged = stageVscodeE2eEvidence({ manifestPath, artifactRoot, outcomeFile });
      assert.equal(staged.validation.valid, true);
      const manifest = readEvidenceManifest(path.join(artifactRoot, manifestFileName));
      assert.equal(manifest.attachments.length, attempts * 2);
      for (const attachment of manifest.attachments) {
        assert.ok(fs.existsSync(path.join(artifactRoot, attachment.evidence.screenshot.path)));
        assert.ok(fs.existsSync(path.join(artifactRoot, attachment.evidence.sidecar.path)));
        assert.match(attachment.evidence.screenshot.path, /^d\/x-[a-f0-9]{12}\.png$/);
        assert.match(attachment.evidence.sidecar.path, /^d\/x-[a-f0-9]{12}\.json$/);
      }
      const report = generateVscodeE2eEvidenceReport({
        suiteId: 'statelessVariablesLifecycle',
        artifactRoot,
        evidenceManifest: path.join(artifactRoot, manifestFileName),
      });
      assert.match(report.html, /stateless-variables-initialize-click-1-before/);
      assert.match(report.html, /src="data:image\/png;base64,/);
      assert.equal(
        manifest.groups
          .flatMap((group) => group.checkpoints)
          .find((checkpoint) => checkpoint.id === 'stateless-variables-initialize-panel-open').status,
        'not-reached'
      );
    });
  }
});

test('unexpected UI diagnostic capture preserves safe correlation through actual artifact staging', () => {
  withFixture(({ root, evidenceDir, manifestPath, artifactRoot }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'workspaceMultiRoot',
      invocation: 'unexpected-ui-staging',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: SUITE_REGISTRY.workspaceMultiRoot.expectedPhases,
    });
    const before = readEvidenceManifest(manifestPath).groups;
    const diagnosticContext = {
      operationId: 'unexpected-ui:1',
      nativeInvocation: 'unit-native-invocation',
      phase: 'regular-workbench-debug-root-1',
    };
    const target = { owner: 'workbench', opaqueTargetId: 'id-12345678', opaqueFrameId: 'id-87654321', generation: 7 };
    writeCapture({
      root,
      manifestPath,
      checkpoint: 'unexpected-ui-staging',
      classification: 'diagnostic',
      verdict: 'diagnostic',
      privateFields: { diagnosticContext, target, promptText: 'private-account@example.test' },
    });
    assert.deepEqual(readEvidenceManifest(manifestPath).groups, before);
    const outcomeFile = writeStructuredInputs(artifactRoot, 'workspaceMultiRoot', 'failure');
    const staged = stageVscodeE2eEvidence({ manifestPath, artifactRoot, outcomeFile });
    assert.equal(staged.validation.valid, true);
    const manifest = readEvidenceManifest(path.join(artifactRoot, manifestFileName));
    const attachment = manifest.attachments.find((item) => item.id === 'unexpected-ui-staging');
    assert.ok(attachment.evidence.screenshot);
    assert.deepEqual(fs.readFileSync(path.join(artifactRoot, attachment.evidence.screenshot.path)), pngBytes);
    const sidecarText = fs.readFileSync(path.join(artifactRoot, attachment.evidence.sidecar.path), 'utf8');
    const sidecar = JSON.parse(sidecarText);
    assert.deepEqual(sidecar.diagnosticContext, diagnosticContext);
    assert.deepEqual(sidecar.target, target);
    assert.doesNotMatch(sidecarText, /private-account/);
  });
});

test('staging rejects tampered content and retains a bounded validation result', () => {
  withFixture(({ root, evidenceDir, manifestPath, artifactRoot }) => {
    initializeSuiteEvidenceManifest({
      suiteId: 'unitTests',
      invocation: 'unit-tamper',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: ['unitTests'],
    });
    writeCapture({
      root,
      manifestPath,
      checkpoint: 'empty-window-startup',
      classification: 'evidence',
      verdict: 'accepted',
    });
    const screenshotPath = readEvidenceManifest(manifestPath).groups[0].checkpoints[0].evidence.screenshot.path;
    fs.appendFileSync(path.join(evidenceDir, screenshotPath), 'tamper');
    const resultPath = writeStructuredInputs(artifactRoot, 'unitTests', 'success');
    assert.throws(() => stageVscodeE2eEvidence({ manifestPath, artifactRoot, outcomeFile: resultPath }), /integrity mismatch/);
    const validation = JSON.parse(fs.readFileSync(path.join(artifactRoot, validationFileName), 'utf8'));
    assert.equal(validation.valid, false);
    assert.match(validation.errors[0], /integrity mismatch/);
    assert.ok(!fs.existsSync(path.join(artifactRoot, screenshotPath)));
  });
});

test('schema rejects traversal and absolute evidence references independent of host OS', () => {
  withFixture(({ evidenceDir }) => {
    const manifest = initializeSuiteEvidenceManifest({
      suiteId: 'unitTests',
      invocation: 'unit-paths',
      platform: 'linux',
      evidenceDir,
      expectedPhaseIds: ['unitTests'],
    });
    const checkpoint = manifest.groups[0].checkpoints[0];
    for (const unsafePath of ['../secret.json', '/private/secret.json', 'C:\\private\\secret.json']) {
      const unsafe = JSON.parse(JSON.stringify(manifest));
      checkpointCopy(unsafe).evidence = {
        sidecar: {
          path: unsafePath,
          sha256: '0'.repeat(64),
          size: 1,
        },
      };
      assert.throws(() => validateEvidenceManifest(unsafe), /bundle path|sidecar path/);
    }
    assert.equal(checkpoint.id, 'empty-window-startup');
  });
});

function checkpointCopy(manifest) {
  return manifest.groups[0].checkpoints[0];
}

function writeCapture({ root, manifestPath, checkpoint, classification, verdict, privateFields = {}, expectedInvocation }) {
  const sourceRoot = path.join(root, 'capture-source');
  fs.mkdirSync(sourceRoot, { recursive: true });
  const metadataPath = path.join(sourceRoot, `${checkpoint}.json`);
  if (verdict === 'accepted' || verdict === 'diagnostic') {
    fs.writeFileSync(path.join(sourceRoot, `${checkpoint}.png`), pngBytes);
  }
  const metadata = {
    schemaVersion: 1,
    checkpoint,
    phase: 'fixture',
    classification,
    verdict,
    reasonCodes: [],
    ...privateFields,
  };
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata)}\n`);
  recordScreenshotMetadata({
    manifestPath,
    metadataPath,
    metadata,
    expectedInvocation: expectedInvocation ?? readEvidenceManifest(manifestPath).invocation,
  });
}

function writeStructuredInputs(artifactRoot, suiteId, outcome) {
  const resultsRoot = path.join(artifactRoot, 'results');
  fs.mkdirSync(resultsRoot, { recursive: true });
  const resultPath = path.join(resultsRoot, `${suiteId}.json`);
  fs.writeFileSync(
    resultPath,
    `${JSON.stringify({ label: suiteId, outcome, total: 1, passing: outcome === 'success' ? 1 : 0, failing: outcome === 'success' ? 0 : 1, pending: 0 })}\n`
  );
  fs.writeFileSync(
    path.join(resultsRoot, `${suiteId}.terminal-result.json`),
    `${JSON.stringify({
      complete: outcome === 'success',
      lifecycleFinalized: true,
      exitCode: outcome === 'success' ? 0 : 1,
      signal: null,
      cleanupVerified: true,
      originalProcessClosureVerified: true,
      phaseCompleteness: true,
      expectedPhaseIds: SUITE_REGISTRY[suiteId].expectedPhases,
      observedPhaseIds: SUITE_REGISTRY[suiteId].expectedPhases,
      phaseResults: SUITE_REGISTRY[suiteId].expectedPhases.map((phaseId) => ({
        phaseId,
        complete: true,
        exitCode: 0,
        signal: null,
        cleanupVerified: true,
      })),
    })}\n`
  );
  fs.writeFileSync(
    path.join(resultsRoot, `admission-context-${suiteId}.json`),
    `${JSON.stringify({ sourceSHA: 'fixture-sha', resolvedVSCodeBuild: '1.105.0' })}\n`
  );
  return resultPath;
}

function withFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-e2e-evidence-manifest-'));
  try {
    const evidenceDir = path.join(root, 'evidence');
    const artifactRoot = path.join(root, 'artifact');
    fs.mkdirSync(artifactRoot, { recursive: true });
    run({
      root,
      evidenceDir,
      artifactRoot,
      manifestPath: path.join(evidenceDir, manifestFileName),
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
