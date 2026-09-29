import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ScreenshotReadinessSnapshot } from './screenshotReadiness';

async function main(): Promise<void> {
  const screenshotDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-screenshot-unit-'));
  process.env.LA_E2E_CLI_SCREENSHOT_DIR = screenshotDir;
  const { appendFailureAttachmentSafely, captureCdpScreenshot, setScreenshotFileSystemForTests } = await import('./screenshot');

  await testStableCaptureAccepted(captureCdpScreenshot, screenshotDir);
  await testTransientInvalidationRetries(captureCdpScreenshot, screenshotDir);
  await testWorkbenchShellStructuralInvalidationRetries(captureCdpScreenshot, screenshotDir);
  await testCaptureRpcFailureRetries(captureCdpScreenshot, screenshotDir);
  await testPostcheckFailureRejectsEvidence(captureCdpScreenshot);
  await testEvidenceMissingDataThrows(captureCdpScreenshot);
  await testFrameTreeFailureDoesNotMaskOriginalReadinessFailure(captureCdpScreenshot);
  await testAbsoluteDeadlineRejectsDelayedStability(captureCdpScreenshot);
  await testDiagnosticStorageFailureDoesNotThrow(captureCdpScreenshot, setScreenshotFileSystemForTests);
  await testDiagnosticDoesNotRequireSemanticBindingOrLatch(captureCdpScreenshot);
  await testEvidenceStorageFailureStillThrows(captureCdpScreenshot, setScreenshotFileSystemForTests);
  testFailureAttachmentStorageFailureDoesNotThrow(appendFailureAttachmentSafely, setScreenshotFileSystemForTests);
  await testHiddenSemanticContextRejects(captureCdpScreenshot);
  await testWrongSemanticContextRejects(captureCdpScreenshot);
  await testSemanticContextReacquiresMatchingVisibleContext(captureCdpScreenshot);
  await testSemanticContextReacquiresOnlySameFrameAndInstallsLatch(captureCdpScreenshot);
  await testAmbiguousSemanticContextRejects(captureCdpScreenshot);
  await testOwnerFrameInvalidationRetriesCapture(captureCdpScreenshot);
  await testSemanticOwnerParentFrameAccepted(captureCdpScreenshot);
  await testSemanticContextFrameOutsideTargetRejects(captureCdpScreenshot);
  await testSemanticOwnerOpenerFrameAccepted(captureCdpScreenshot);
  await testSemanticOwnerExactVisibleIframeAccepted(captureCdpScreenshot);
  await testSemanticOwnerExactHiddenIframeRejects(captureCdpScreenshot);
  await testSemanticOwnerFrameMismatchRejects(captureCdpScreenshot);
  await testOwnerActiveTabMismatchRejects(captureCdpScreenshot);
  console.log('[screenshot.unit] all tests passed');
}

async function testStableCaptureAccepted(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  screenshotDir: string
): Promise<void> {
  const cdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })]);

  const screenshotPath = await captureCdpScreenshot(cdp, 'stable-evidence', {
    expectation: { kind: 'workbenchShell', label: 'stable-evidence' },
    timeoutMs: 5000,
  });

  assert.strictEqual(path.dirname(screenshotPath ?? ''), screenshotDir);
  assert.strictEqual(cdp.captureAttempts, 1);
  assert.ok(screenshotPath && fs.existsSync(screenshotPath));
  assert.ok(fs.existsSync(screenshotPath.replace(/\.png$/, '.json')));
}

async function testTransientInvalidationRetries(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  screenshotDir: string
): Promise<void> {
  const cdp = new FakeCaptureCdp([
    snapshot({ revision: 0, expectationKind: 'designerCanvas' }),
    snapshot({ revision: 0, expectationKind: 'designerCanvas' }),
    snapshot({ revision: 1, expectationKind: 'designerCanvas' }),
    snapshot({ revision: 1, expectationKind: 'designerCanvas' }),
    snapshot({ revision: 1, expectationKind: 'designerCanvas' }),
    snapshot({ revision: 1, expectationKind: 'designerCanvas' }),
  ]);

  const screenshotPath = await captureCdpScreenshot(cdp, 'transient-retry', {
    expectation: { kind: 'designerCanvas', label: 'transient-retry' },
    timeoutMs: 5000,
  });

  assert.strictEqual(path.dirname(screenshotPath ?? ''), screenshotDir);
  assert.strictEqual(cdp.captureAttempts, 2);
}

async function testWorkbenchShellStructuralInvalidationRetries(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  screenshotDir: string
): Promise<void> {
  const cdp = new FakeCaptureCdp([
    snapshot({ revision: 0, structuralRevision: 0 }),
    snapshot({ revision: 0, structuralRevision: 0 }),
    snapshot({ revision: 2, structuralRevision: 1 }),
    snapshot({ revision: 2, structuralRevision: 1 }),
    snapshot({ revision: 2, structuralRevision: 1 }),
  ]);

  const screenshotPath = await captureCdpScreenshot(cdp, 'workbench-structural-retry', {
    expectation: { kind: 'workbenchShell', label: 'workbench-structural-retry' },
    timeoutMs: 5000,
  });

  assert.strictEqual(path.dirname(screenshotPath ?? ''), screenshotDir);
  assert.strictEqual(cdp.captureAttempts, 2);
}

async function testCaptureRpcFailureRetries(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  screenshotDir: string
): Promise<void> {
  const cdp = new FakeCaptureCdp(
    [
      snapshot({ revision: 0 }),
      snapshot({ revision: 0 }),
      snapshot({ revision: 0 }),
      snapshot({ revision: 0 }),
      snapshot({ revision: 0 }),
      snapshot({ revision: 0 }),
    ],
    { captureFailures: 1 }
  );

  const screenshotPath = await captureCdpScreenshot(cdp, 'capture-rpc-retry', {
    expectation: { kind: 'workbenchShell', label: 'capture-rpc-retry' },
    timeoutMs: 5000,
  });

  assert.strictEqual(path.dirname(screenshotPath ?? ''), screenshotDir);
  assert.strictEqual(cdp.captureAttempts, 2);
}

async function testPostcheckFailureRejectsEvidence(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const cdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], { failPostSample: true });

  await assert.rejects(
    captureCdpScreenshot(cdp, 'postcheck-fails', {
      expectation: { kind: 'workbenchShell', label: 'postcheck-fails' },
      timeoutMs: 1000,
    }),
    /Screenshot readiness failed|postcheck/
  );
}

async function testEvidenceMissingDataThrows(captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot): Promise<void> {
  const cdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    omitCaptureData: true,
  });

  await assert.rejects(
    captureCdpScreenshot(cdp, 'missing-data', {
      expectation: { kind: 'workbenchShell', label: 'missing-data' },
      timeoutMs: 1000,
    }),
    /no data/
  );
}

async function testFrameTreeFailureDoesNotMaskOriginalReadinessFailure(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const cdp = new FakeCaptureCdp([], { failFrameTree: true });

  await assert.rejects(
    captureCdpScreenshot(cdp, 'frame-tree-failure', {
      expectation: { kind: 'workbenchShell', label: 'frame-tree-failure' },
      classification: 'evidence',
      timeoutMs: 25,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(!/Cannot read properties|undefined|null|TypeError/i.test(error.message), error.message);
      assert.ok(/Screenshot readiness failed|deadline/i.test(error.message), error.message);
      return true;
    }
  );
}

async function testAbsoluteDeadlineRejectsDelayedStability(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const cdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    evaluateDelayMs: 250,
  });

  await assert.rejects(
    captureCdpScreenshot(cdp, 'deadline-exceeded', {
      expectation: { kind: 'workbenchShell', label: 'deadline-exceeded' },
      timeoutMs: 400,
    }),
    /Screenshot readiness failed|deadline/
  );
}

async function testDiagnosticStorageFailureDoesNotThrow(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  setScreenshotFileSystemForTests: typeof import('./screenshot').setScreenshotFileSystemForTests
): Promise<void> {
  const restore = setScreenshotFileSystemForTests({
    mkdirSync: () => {
      throw new Error('diagnostic storage denied');
    },
  });
  try {
    const cdp = new FakeCaptureCdp([snapshot({ revision: 0 })]);
    const screenshotPath = await captureCdpScreenshot(cdp, 'diagnostic-storage-denied', {
      classification: 'diagnostic',
      expectation: { kind: 'diagnostic', label: 'diagnostic-storage-denied', reason: 'unit-storage-failure' },
      timeoutMs: 1000,
    });
    assert.strictEqual(screenshotPath, undefined);
  } finally {
    restore();
  }
}

async function testDiagnosticDoesNotRequireSemanticBindingOrLatch(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    failLatchEvaluation: true,
    targetUrl: 'vscode-webview://detached-diagnostic',
    contexts: [{ id: 7, text: '', visible: false }],
    ownerFrameIds: [],
  });

  await captureCdpScreenshot(ownerCdp, 'diagnostic-with-detached-semantic-target', {
    classification: 'diagnostic',
    expectation: { kind: 'diagnostic', label: 'diagnostic-with-detached-semantic-target', reason: 'unit' },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });

  assert.strictEqual(semanticCdp.latchInstallAttempts, 0);
}

async function testEvidenceStorageFailureStillThrows(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  setScreenshotFileSystemForTests: typeof import('./screenshot').setScreenshotFileSystemForTests
): Promise<void> {
  const restore = setScreenshotFileSystemForTests({
    mkdirSync: () => {
      throw new Error('evidence storage denied');
    },
  });
  try {
    const cdp = new FakeCaptureCdp([snapshot({ revision: 0 })]);
    await assert.rejects(
      captureCdpScreenshot(cdp, 'evidence-storage-denied', {
        expectation: { kind: 'workbenchShell', label: 'evidence-storage-denied' },
        timeoutMs: 1000,
      }),
      /evidence storage denied/
    );
  } finally {
    restore();
  }
}

function testFailureAttachmentStorageFailureDoesNotThrow(
  appendFailureAttachmentSafely: typeof import('./screenshot').appendFailureAttachmentSafely,
  setScreenshotFileSystemForTests: typeof import('./screenshot').setScreenshotFileSystemForTests
): void {
  const restore = setScreenshotFileSystemForTests({
    mkdirSync: () => {
      throw new Error('attachment storage denied');
    },
  });
  try {
    assert.doesNotThrow(() =>
      appendFailureAttachmentSafely({
        label: 'unit',
        testTitle: 'diagnostic attachment storage failure',
        screenshotPath: 'diagnostic.png',
        createdAt: new Date(0).toISOString(),
      })
    );
  } finally {
    restore();
  }
}

async function testHiddenSemanticContextRejects(captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-hidden',
    contexts: [{ id: 7, text: 'Response Succeeded', visible: false }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'hidden-semantic-context', {
      expectation: { kind: 'monitoringAction', label: 'hidden-semantic-context', actionTitle: 'Response', expectedStatus: 'Succeeded' },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /semantic context/
  );
}

async function testWrongSemanticContextRejects(captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-wrong',
    contexts: [{ id: 7, text: 'Get current weather Succeeded', visible: true }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'wrong-semantic-context', {
      expectation: { kind: 'monitoringAction', label: 'wrong-semantic-context', actionTitle: 'Response', expectedStatus: 'Succeeded' },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /semantic context/
  );
}

async function testSemanticContextReacquiresMatchingVisibleContext(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-response',
    contexts: [
      { id: 7, text: 'stale hidden Response Succeeded', visible: false },
      { id: 8, text: 'Response Succeeded Outputs response payload', visible: true },
    ],
  });

  await captureCdpScreenshot(ownerCdp, 'reacquired-semantic-context', {
    expectation: { kind: 'monitoringAction', label: 'reacquired-semantic-context', actionTitle: 'Response', expectedStatus: 'Succeeded' },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });
  assert.ok(semanticCdp.evaluatedContextIds.includes(8), 'Expected capture to sample the reacquired visible context');
}

async function testSemanticContextReacquiresOnlySameFrameAndInstallsLatch(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    mainFrameId: 'semantic-root-frame',
    mainFrameParentId: 'workbench-frame',
    semanticChildFrameIds: ['expected-frame', 'wrong-frame'],
    targetUrl: 'vscode-webview://logic-apps-same-frame',
    contexts: [
      { id: 7, text: 'stale hidden Response Succeeded', visible: false, frameId: 'expected-frame' },
      { id: 8, text: 'Response Succeeded Outputs wrong frame payload', visible: true, frameId: 'wrong-frame' },
      { id: 9, text: 'Response Succeeded Outputs expected frame payload', visible: true, frameId: 'expected-frame' },
    ],
  });

  await captureCdpScreenshot(ownerCdp, 'reacquired-same-frame-semantic-context', {
    expectation: {
      kind: 'monitoringAction',
      label: 'reacquired-same-frame-semantic-context',
      actionTitle: 'Response',
      expectedStatus: 'Succeeded',
    },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });

  assert.ok(!semanticCdp.evaluatedContextIds.includes(8), 'Reacquisition must skip visible contexts from a different semantic frame');
  assert.ok(semanticCdp.evaluatedContextIds.includes(9), 'Expected capture to sample the reacquired same-frame context');
  assert.deepStrictEqual(semanticCdp.latchInstallContextIds, [9], 'Invalidation latch should be installed on the reacquired context only');
}

async function testAmbiguousSemanticContextRejects(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-ambiguous',
    contexts: [
      { id: 7, text: 'Response Succeeded', visible: false },
      { id: 8, text: 'Response Succeeded Outputs payload one', visible: true },
      { id: 9, text: 'Response Succeeded Outputs payload two', visible: true },
    ],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'ambiguous-semantic-context', {
      expectation: { kind: 'monitoringAction', label: 'ambiguous-semantic-context', actionTitle: 'Response', expectedStatus: 'Succeeded' },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /ambiguous/
  );
}

async function testOwnerFrameInvalidationRetriesCapture(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp(
    [
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
    ],
    { ownerFrameRevisionReads: [0, 1, 1, 1] }
  );
  const semanticCdp = new FakeCaptureCdp(
    [
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction' }),
    ],
    {
      mainFrameId: 'semantic-root-frame',
      mainFrameParentId: 'workbench-frame',
      targetUrl: 'vscode-webview://logic-apps-owner-revision',
      contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true, frameId: 'semantic-root-frame' }],
    }
  );

  await captureCdpScreenshot(ownerCdp, 'owner-frame-invalidation-retries-capture', {
    expectation: {
      kind: 'monitoringAction',
      label: 'owner-frame-invalidation-retries-capture',
      actionTitle: 'Response',
      expectedStatus: 'Succeeded',
    },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });

  assert.strictEqual(ownerCdp.captureAttempts, 2, 'Owner frame mutation during capture should discard the candidate and retry');
}

async function testSemanticOwnerFrameMismatchRejects(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], { ownerFrameIds: [] });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-detached',
    contexts: [{ id: 7, text: 'Response Succeeded', visible: true }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'owner-frame-mismatch', {
      expectation: { kind: 'monitoringAction', label: 'owner-frame-mismatch', actionTitle: 'Response', expectedStatus: 'Succeeded' },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /semantic frame|owner frame/
  );
}

async function testSemanticOwnerParentFrameAccepted(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const screenshotDir = process.env.LA_E2E_CLI_SCREENSHOT_DIR;
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], { ownerFrameIds: [] });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    mainFrameId: 'semantic-root-frame',
    mainFrameParentId: 'workbench-frame',
    semanticChildFrameIds: ['wizard-context-frame'],
    targetUrl: 'vscode-webview://logic-apps-parent-frame',
    contexts: [{ id: 7, text: 'Response Succeeded', visible: true, frameId: 'wizard-context-frame' }],
  });

  const screenshotPath = await captureCdpScreenshot(ownerCdp, 'owner-parent-frame-accepted', {
    expectation: { kind: 'monitoringAction', label: 'owner-parent-frame-accepted', actionTitle: 'Response', expectedStatus: 'Succeeded' },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });
  const metadata = JSON.parse(fs.readFileSync(path.join(screenshotDir ?? '', 'owner-parent-frame-accepted.json'), 'utf8')) as {
    target: { opaqueFrameId: string; opaqueTargetId: string };
  };
  assert.ok(screenshotPath);
  assert.notStrictEqual(
    metadata.target.opaqueFrameId,
    metadata.target.opaqueTargetId,
    'semantic captures should record the semantic context frame'
  );
}

async function testSemanticContextFrameOutsideTargetRejects(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], { ownerFrameIds: [] });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    mainFrameId: 'semantic-root-frame',
    mainFrameParentId: 'workbench-frame',
    semanticChildFrameIds: ['wizard-context-frame'],
    targetUrl: 'vscode-webview://logic-apps-parent-frame',
    contexts: [{ id: 7, text: 'Response Succeeded', visible: true, frameId: 'detached-context-frame' }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'semantic-context-frame-outside-target', {
      expectation: {
        kind: 'monitoringAction',
        label: 'semantic-context-frame-outside-target',
        actionTitle: 'Response',
        expectedStatus: 'Succeeded',
      },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /semantic context frame/
  );
}

async function testSemanticOwnerOpenerFrameAccepted(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], { ownerFrameIds: ['owner-webview-frame'] });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    mainFrameId: 'semantic-oopif-main',
    openerFrameId: 'owner-webview-frame',
    targetUrl: 'vscode-webview://logic-apps-oopif',
    contexts: [{ id: 7, text: 'Response Succeeded', visible: true }],
  });

  await captureCdpScreenshot(ownerCdp, 'owner-opener-frame-accepted', {
    expectation: { kind: 'monitoringAction', label: 'owner-opener-frame-accepted', actionTitle: 'Response', expectedStatus: 'Succeeded' },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });
}

async function testSemanticOwnerExactVisibleIframeAccepted(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const targetUrl = 'vscode-webview://logic-apps-exact?id=expected';
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    exactIframeTargetUrl: targetUrl,
    exactIframeVisible: true,
    ownerFrameIds: [],
  });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl,
    contexts: [{ id: 7, text: 'Response Succeeded', visible: true }],
  });

  await captureCdpScreenshot(ownerCdp, 'owner-exact-visible-iframe-accepted', {
    expectation: {
      kind: 'monitoringAction',
      label: 'owner-exact-visible-iframe-accepted',
      actionTitle: 'Response',
      expectedStatus: 'Succeeded',
    },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });
}

async function testSemanticOwnerExactHiddenIframeRejects(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const targetUrl = 'vscode-webview://logic-apps-exact?id=expected';
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    exactIframeTargetUrl: targetUrl,
    exactIframeVisible: false,
    ownerFrameIds: [],
  });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl,
    contexts: [{ id: 7, text: 'Response Succeeded', visible: true }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'owner-exact-hidden-iframe-rejected', {
      expectation: {
        kind: 'monitoringAction',
        label: 'owner-exact-hidden-iframe-rejected',
        actionTitle: 'Response',
        expectedStatus: 'Succeeded',
      },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /semantic frame|owner frame/
  );
}

async function testOwnerActiveTabMismatchRejects(captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], { activeTabText: 'Different Workflow' });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-active-tab',
    contexts: [{ id: 7, text: 'Response Succeeded', visible: true }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'owner-active-tab-mismatch', {
      expectation: { kind: 'monitoringAction', label: 'owner-active-tab-mismatch', actionTitle: 'Response', expectedStatus: 'Succeeded' },
      semanticCdp,
      semanticContextId: 7,
      binding: { activeTabText: ['Expected Workflow'] },
      timeoutMs: 1000,
    }),
    /active tab/
  );
}

class FakeCaptureCdp {
  readonly contextGeneration = 0;
  captureAttempts = 0;
  readonly targetId = 'fake-owner-target';
  readonly targetUrl?: string;
  readonly targetTitle?: string;
  readonly evaluatedContextIds: Array<number | undefined> = [];
  readonly latchInstallContextIds: Array<number | undefined> = [];
  latchInstallAttempts = 0;
  private readinessIndex = 0;
  private ownerFrameRevisionReadIndex = 0;
  private exactIframeRevisionReadIndex = 0;

  constructor(
    private readonly readinessSnapshots: ScreenshotReadinessSnapshot[],
    private readonly options: {
      captureData?: string;
      failPostSample?: boolean;
      omitCaptureData?: boolean;
      evaluateDelayMs?: number;
      contexts?: Array<{ id: number; text: string; visible: boolean; frameId?: string }>;
      activeTabText?: string;
      captureFailures?: number;
      mainFrameId?: string;
      mainFrameParentId?: string;
      ownerFrameIds?: string[];
      semanticChildFrameIds?: string[];
      openerFrameId?: string;
      ownerFrameVisible?: boolean;
      exactIframeTargetUrl?: string;
      exactIframeVisible?: boolean;
      ownerFrameRevisionReads?: number[];
      exactIframeRevisionReads?: number[];
      failLatchEvaluation?: boolean;
      targetUrl?: string;
      targetTitle?: string;
      failFrameTree?: boolean;
    } = {}
  ) {
    this.targetUrl = options.targetUrl;
    this.targetTitle = options.targetTitle;
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (method === 'Page.getFrameTree') {
      if (this.options.failFrameTree) {
        throw new Error('synthetic Page.getFrameTree timeout');
      }
      const mainFrameId = this.options.mainFrameId ?? (this.targetUrl ? 'semantic-frame' : 'workbench-frame');
      const childFrameIds = this.targetUrl
        ? (this.options.semanticChildFrameIds ?? [])
        : (this.options.ownerFrameIds ?? ['semantic-frame']);
      return {
        result: {
          frameTree: {
            frame: { id: mainFrameId, parentId: this.options.mainFrameParentId },
            childFrames: childFrameIds.map((id) => ({ frame: { id, parentId: mainFrameId } })),
          },
        },
      };
    }
    if (method === 'DOM.getFrameOwner') {
      return { result: { backendNodeId: 42 } };
    }
    if (method === 'Target.getTargetInfo') {
      return { result: { targetInfo: { openerFrameId: this.options.openerFrameId } } };
    }
    if (method === 'DOM.resolveNode') {
      return { result: { object: { objectId: 'owner-frame-object' } } };
    }
    if (method === 'Runtime.callFunctionOn') {
      const functionDeclaration = String(params?.functionDeclaration ?? '');
      if (functionDeclaration.includes('__logicAppsOwnerFrameInvalidation')) {
        if (functionDeclaration.includes('"read"')) {
          const reads = this.options.ownerFrameRevisionReads ?? [0];
          const revision = reads[Math.min(this.ownerFrameRevisionReadIndex, reads.length - 1)];
          this.ownerFrameRevisionReadIndex++;
          return { result: { result: { value: { revision } } } };
        }
        if (functionDeclaration.includes('"install"')) {
          return { result: { result: { value: { revision: 0 } } } };
        }
        if (functionDeclaration.includes('"dispose"')) {
          return { result: { result: { value: { revision: 0 } } } };
        }
      }
      return { result: { result: { value: { visible: this.options.ownerFrameVisible ?? true } } } };
    }
    if (method === 'Page.captureScreenshot') {
      this.captureAttempts++;
      if (this.options.captureFailures && this.captureAttempts <= this.options.captureFailures) {
        throw new Error('synthetic capture timeout');
      }
      return {
        result: { data: this.options.omitCaptureData ? undefined : (this.options.captureData ?? Buffer.from('png').toString('base64')) },
      };
    }
    return { result: {} };
  }

  async evaluate<T>(_contextId: number | undefined, expression: string): Promise<T> {
    this.evaluatedContextIds.push(_contextId);
    if (this.options.evaluateDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.evaluateDelayMs));
    }
    if (
      expression.includes("const key = '__logicAppsScreenshotInvalidation'") ||
      expression.includes('delete globalThis.__logicAppsScreenshotInvalidation')
    ) {
      if (expression.includes("const key = '__logicAppsScreenshotInvalidation'")) {
        this.latchInstallAttempts++;
        this.latchInstallContextIds.push(_contextId);
      }
      if (this.options.failLatchEvaluation) {
        throw new Error('synthetic latch failure');
      }
      return { revision: 0 } as T;
    }
    if (this.options.failPostSample && this.readinessIndex >= 2) {
      throw new Error('synthetic postcheck failure');
    }
    if (expression.includes('visibleWorkbench:')) {
      return {
        activeTabText: this.options.activeTabText ?? 'Expected Workflow',
        activeTabVisible: true,
        visibleWorkbench: true,
      } as T;
    }
    if (expression.includes('const targetUrl =')) {
      const targetUrlMatch = expression.match(/const targetUrl = "([^"]*)";/);
      const targetUrl = targetUrlMatch ? JSON.parse(`"${targetUrlMatch[1]}"`) : '';
      const count = targetUrl && targetUrl === this.options.exactIframeTargetUrl ? 1 : 0;
      if (expression.includes('__logicAppsOwnerFrameInvalidation')) {
        if (expression.includes('"read"')) {
          const reads = this.options.exactIframeRevisionReads ?? [0];
          const revision = reads[Math.min(this.exactIframeRevisionReadIndex, reads.length - 1)];
          this.exactIframeRevisionReadIndex++;
          return { installed: count === 1, revision } as T;
        }
        return { installed: count === 1, revision: 0 } as T;
      }
      return { count, visible: count === 1 && this.options.exactIframeVisible === true } as T;
    }
    if (/const expectedText = \[/.test(expression)) {
      const context = this.options.contexts?.find((candidate) => candidate.id === _contextId) ?? this.options.contexts?.[0];
      const expectedTextMatch = expression.match(/const expectedText = (\[[^\n]+]);/);
      const expectedText = expectedTextMatch ? (JSON.parse(expectedTextMatch[1]) as string[]) : [];
      const normalizedContextText = (context?.text ?? '').toLowerCase();
      return {
        ok: !!context?.visible && expectedText.every((value) => normalizedContextText.includes(value.toLowerCase())),
        text: context?.text ?? '',
      } as T;
    }
    const snapshotValue = this.readinessSnapshots[Math.min(this.readinessIndex, this.readinessSnapshots.length - 1)];
    this.readinessIndex++;
    return snapshotValue as T;
  }

  getExecutionContextIds(): number[] {
    return (this.options.contexts ?? []).map((context) => context.id);
  }

  getExecutionContextFrameId(contextId: number): string | undefined {
    const context = this.options.contexts?.find((candidate) => candidate.id === contextId);
    return context?.frameId ?? (this.targetUrl ? (this.options.mainFrameId ?? 'semantic-frame') : undefined);
  }
}

function snapshot(options: {
  revision: number;
  structuralRevision?: number;
  expectationKind?: ScreenshotReadinessSnapshot['expectationKind'];
}): ScreenshotReadinessSnapshot {
  return {
    ready: true,
    reasonCodes: ['ready'],
    blockers: [],
    anchors: [{ name: 'body', visible: true, bounds: { left: 0, top: 0, width: 100, height: 100 } }],
    viewport: { width: 100, height: 100, deviceScaleFactor: 1 },
    counts: { loaders: 0 },
    generation: 0,
    revision: options.revision,
    structuralRevision: options.structuralRevision ?? options.revision,
    scrollY: 0,
    expectationKind: options.expectationKind ?? 'workbenchShell',
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
