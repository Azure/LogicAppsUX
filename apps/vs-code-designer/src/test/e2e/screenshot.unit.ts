import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { mock } from 'node:test';
import type { PhysicalWorkspaceIdentityAuthority, PhysicalWorkspaceIdentityLease } from './screenshot';
import type { ScreenshotReadinessSnapshot } from './screenshotReadiness';
import { runRegenerationPhysicalAuthorityControls } from './regenerationPhysicalWorkspaceAuthority.unit';

const { JSDOM } = require('jsdom') as { JSDOM: new (html: string, options?: Record<string, unknown>) => { window: SerializedDomWindow } };

async function main(): Promise<void> {
  const screenshotDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-screenshot-unit-'));
  process.env.LA_E2E_CLI_SCREENSHOT_DIR = screenshotDir;
  const {
    appendFailureAttachmentSafely,
    captureCdpScreenshot,
    installFailureScreenshotHook,
    sanitizeDiagnosticCheckpointId,
    setScreenshotFileSystemForTests,
  } = await import('./screenshot');
  const { captureRegenerationFailureDiagnostics, closeRegenerationWindowAfterDiagnostics } = await import(
    './workspaceArtifactRegeneration.test'
  );

  await runRegenerationPhysicalAuthorityControls();
  let closeCalls = 0;
  const close = async () => {
    closeCalls++;
  };
  await assert.rejects(closeRegenerationWindowAfterDiagnostics('renderer-cleanup-failed', true, close));
  assert.strictEqual(closeCalls, 0, 'Unconfirmed renderer cleanup must not send ordinary close input');
  await closeRegenerationWindowAfterDiagnostics(undefined, true, close);
  assert.strictEqual(closeCalls, 1, 'The ordinary close path is unchanged when renderer cleanup succeeds');
  testFailureScreenshotHookInstallsOnce(installFailureScreenshotHook);
  testDiagnosticCheckpointNormalization(sanitizeDiagnosticCheckpointId);
  await testOwnerBindingDeadlineRetainsContext(captureCdpScreenshot, screenshotDir);
  await testOwnerBindingProtocolErrorAtDeadlineRemainsOriginal(captureCdpScreenshot);
  await testStableCaptureAccepted(captureCdpScreenshot, screenshotDir);
  await testAcceptedCaptureUpdatesOrderedEvidenceManifest(captureCdpScreenshot);
  await testTransientInvalidationRetries(captureCdpScreenshot, screenshotDir);
  await testWorkbenchShellStructuralInvalidationRetries(captureCdpScreenshot, screenshotDir);
  await testCaptureRpcFailureRetries(captureCdpScreenshot, screenshotDir);
  await testPostcheckFailureRejectsEvidence(captureCdpScreenshot);
  await testEvidenceMissingDataThrows(captureCdpScreenshot);
  await testFrameTreeFailureDoesNotMaskOriginalReadinessFailure(captureCdpScreenshot);
  await testAbsoluteDeadlineRejectsDelayedStability(captureCdpScreenshot);
  await testReadinessUnavailableRecordsLastSampleDiagnostics(captureCdpScreenshot, setScreenshotFileSystemForTests);
  await testDiagnosticStorageFailureDoesNotThrow(captureCdpScreenshot, setScreenshotFileSystemForTests);
  await testImmediateDiagnosticSurvivesMetadataFailure(captureCdpScreenshot, setScreenshotFileSystemForTests, screenshotDir);
  await testRegenerationScreenshotOwnership(
    captureCdpScreenshot,
    captureRegenerationFailureDiagnostics,
    setScreenshotFileSystemForTests,
    screenshotDir
  );
  await testStaleDiagnosticImageIsNotCurrentCapture(captureCdpScreenshot, setScreenshotFileSystemForTests, screenshotDir);
  await testDiagnosticOrderedRegistrationFailureIsReported(captureCdpScreenshot, screenshotDir);
  await testDiagnosticDoesNotRequireSemanticBindingOrLatch(captureCdpScreenshot);
  await testEvidenceStorageFailureStillThrows(captureCdpScreenshot, setScreenshotFileSystemForTests);
  testFailureAttachmentStorageFailureDoesNotThrow(appendFailureAttachmentSafely, setScreenshotFileSystemForTests);
  await testHiddenSemanticContextRejects(captureCdpScreenshot);
  await testWrongSemanticContextRejects(captureCdpScreenshot);
  await testSemanticContextBindingIncludesControlMetadata(captureCdpScreenshot);
  await testDiscoverySemanticContextWaitsForReadyPhase(captureCdpScreenshot);
  await testDiscoverySemanticContextWithoutVisibleControlRejects(captureCdpScreenshot);
  await testHiddenDiscoverySemanticContextRejects(captureCdpScreenshot);
  await testWrongFrameDiscoverySemanticContextRejects(captureCdpScreenshot);
  await testSemanticContextReacquiresMatchingVisibleContext(captureCdpScreenshot);
  await testSemanticContextReacquiresOnlySameFrameAndInstallsLatch(captureCdpScreenshot);
  await testAmbiguousSemanticContextRejects(captureCdpScreenshot);
  await testOwnerFrameInvalidationRetriesCapture(captureCdpScreenshot);
  await testOwnerNotificationInvalidationRetriesCapture(captureCdpScreenshot);
  await testResolveNodeTimeoutRetriesForOwnerBinding(captureCdpScreenshot);
  await testResolveNodeNonTimeoutFailsFast(captureCdpScreenshot);
  await testSemanticOwnerParentFrameAccepted(captureCdpScreenshot);
  await testSemanticContextFrameOutsideTargetRejects(captureCdpScreenshot);
  await testSemanticOwnerOpenerFrameAccepted(captureCdpScreenshot);
  await testSemanticOwnerExactVisibleIframeAccepted(captureCdpScreenshot);
  await testSemanticOwnerExactHiddenIframeRejects(captureCdpScreenshot);
  await testSemanticOwnerTransientNotificationOcclusionWaits(captureCdpScreenshot);
  await testSemanticOwnerStaleObjectRetries(captureCdpScreenshot);
  await testSemanticOwnerNotificationOcclusionRejects(captureCdpScreenshot);
  await testSemanticOwnerExactIframeNotificationOcclusionRejects(captureCdpScreenshot);
  await testSerializedOwnerVisibilityOcclusionPredicates(captureCdpScreenshot);
  await testSemanticOwnerFrameMismatchRejects(captureCdpScreenshot);
  await testOwnerActiveTabMismatchRejects(captureCdpScreenshot);
  console.log('[screenshot.unit] all tests passed');
}

type OwnershipFault = 'foreign-root' | 'foreign-title' | 'different-document' | 'invalid-time-origin' | 'generation-change' | 'read-error';
type PhysicalIdentityFault =
  | 'foreign-workspace-before'
  | 'foreign-root-before'
  | 'foreign-workspace-after'
  | 'foreign-root-after'
  | 'foreign-workspace-center-before'
  | 'foreign-root-center-after'
  | 'lease-invalidated-during'
  | 'lease-invalidated-during-center'
  | 'root-change-during'
  | 'lease-invalidated-and-renderer-changed'
  | 'lease-invalidated-and-renderer-changed-center'
  | 'renderer-id-change-during'
  | 'cleanup-failed'
  | 'cleanup-failed-center'
  | 'missing-root'
  | 'wrong-target'
  | 'lease-getter-error-before'
  | 'lease-getter-error-after'
  | 'lease-read-error-before'
  | 'lease-read-error-after'
  | 'arm-timeout'
  | 'read-timeout';

/**
 * An in-memory lease model. These controls verify fail-closed handling of
 * reported invalidation, not detection of external swaps or host restarts.
 */
function fakePhysicalIdentity(
  workspaceFilePath: string,
  rootPath: string,
  foreignWorkspace: string,
  foreignRoot: string,
  fault?: PhysicalIdentityFault
): { authority: PhysicalWorkspaceIdentityAuthority; onCapture: () => void } {
  let invalidated = false;
  let rendererInstance = 'modeled-renderer-1';
  let revision = 0;
  let rootPaths = [rootPath];
  let reads = 0;
  let captures = 0;
  let leaseChecks = 0;
  return {
    authority: {
      arm: async (targetId, timeOrigin): Promise<PhysicalWorkspaceIdentityLease> => {
        if (fault === 'arm-timeout') {
          return new Promise(() => undefined);
        }
        return {
          get invalidated() {
            leaseChecks++;
            if (fault === 'lease-getter-error-before' || (fault === 'lease-getter-error-after' && leaseChecks >= 5)) {
              throw new Error('private-physical-identity-error');
            }
            return invalidated;
          },
          read: async () => {
            if (fault === 'read-timeout') {
              return new Promise(() => undefined);
            }
            reads++;
            if (fault === 'lease-read-error-before' || (fault === 'lease-read-error-after' && reads >= 2)) {
              throw new Error('private-physical-identity-error');
            }
            return {
              targetId: fault === 'wrong-target' ? 'foreign-target' : targetId,
              timeOrigin,
              rendererInstance,
              revision,
              workspaceFilePath:
                fault === 'foreign-workspace-before' ||
                (fault === 'foreign-workspace-after' && reads >= 2) ||
                (fault === 'foreign-workspace-center-before' && reads >= 3)
                  ? foreignWorkspace
                  : workspaceFilePath,
              rootPaths:
                fault === 'foreign-root-before' ||
                (fault === 'foreign-root-after' && reads >= 2) ||
                (fault === 'foreign-root-center-after' && reads >= 4)
                  ? [foreignRoot]
                  : fault === 'missing-root'
                    ? []
                    : rootPaths,
              uiRootPaths: rootPaths,
            };
          },
          dispose: () => {
            if (fault === 'cleanup-failed' || (fault === 'cleanup-failed-center' && captures === 2)) {
              throw new Error('private-cleanup-error');
            }
          },
        };
      },
    },
    onCapture: () => {
      captures++;
      if (
        fault === 'lease-invalidated-during' ||
        fault === 'lease-invalidated-and-renderer-changed' ||
        (captures === 2 && (fault === 'lease-invalidated-during-center' || fault === 'lease-invalidated-and-renderer-changed-center'))
      ) {
        invalidated = true;
        revision++;
      }
      if (
        fault === 'lease-invalidated-and-renderer-changed' ||
        fault === 'renderer-id-change-during' ||
        (captures === 2 && fault === 'lease-invalidated-and-renderer-changed-center')
      ) {
        rendererInstance = 'modeled-renderer-2';
      }
      if (fault === 'root-change-during') {
        rootPaths = [foreignRoot];
      }
    },
  };
}

class FakeRegenerationScreenshotCdp {
  targetId: string | undefined = 'unit-workbench-target';
  contextGeneration: number | undefined = 1;
  readonly events: string[] = [];
  ownerReads = 0;
  captureAttempts = 0;

  constructor(
    private readonly options: {
      faults?: Record<number, OwnershipFault>;
      changeGenerationOnCapture?: number;
      changeTargetOnCapture?: number;
      missingGeneration?: boolean;
      onCapture?: () => void;
    } = {}
  ) {
    if (options.missingGeneration) {
      this.contextGeneration = undefined;
    }
  }

  async evaluate<T>(_contextId: number | undefined, expression: string): Promise<T> {
    if (expression.includes('roots: (() => {')) {
      const read = ++this.ownerReads;
      this.events.push(`owner:${read}`);
      const fault = this.options.faults?.[read];
      if (fault === 'read-error') {
        throw new Error('private-workspace-read-error');
      }
      if (fault === 'generation-change') {
        this.contextGeneration = (this.contextGeneration ?? 0) + 1;
      }
      return {
        timeOrigin: fault === 'different-document' ? 43 : fault === 'invalid-time-origin' ? Number.NaN : 42,
        title: fault === 'foreign-title' ? 'other-workspace - Visual Studio Code' : 'unit-workspace (workspace) - Visual Studio Code',
        ready: true,
        roots: fault === 'foreign-root' ? ['other-app'] : ['unit-app'],
      } as T;
    }
    if (expression.includes('.quick-input-widget input')) {
      return true as T;
    }
    if (expression.includes('.quick-input-list .monaco-list-row .label-name')) {
      return { x: 10, y: 20 } as T;
    }
    if (expression.includes('.notifications-list-container')) {
      return true as T;
    }
    return snapshot({ revision: 0, expectationKind: 'diagnostic' }) as T;
  }

  async send(method: string): Promise<unknown> {
    if (method === 'Page.captureScreenshot') {
      const attempt = ++this.captureAttempts;
      this.events.push(`capture:${attempt}`);
      if (this.options.changeGenerationOnCapture === attempt) {
        this.contextGeneration = (this.contextGeneration ?? 0) + 1;
      }
      if (this.options.changeTargetOnCapture === attempt) {
        this.targetId = 'different-target';
      }
      this.options.onCapture?.();
      return { result: { data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, attempt]).toString('base64') } };
    }
    if (method.startsWith('Input.')) {
      this.events.push(method);
    }
    if (method === 'Page.getFrameTree') {
      return { result: { frameTree: { frame: { id: 'unit-workbench-frame' } } } };
    }
    return { result: {} };
  }
}

async function testRegenerationScreenshotOwnership(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  captureRegenerationFailureDiagnostics: typeof import('./workspaceArtifactRegeneration.test').captureRegenerationFailureDiagnostics,
  setScreenshotFileSystemForTests: typeof import('./screenshot').setScreenshotFileSystemForTests,
  screenshotDir: string
): Promise<void> {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-screenshot-owner-evidence-'));
  const previous = {
    dir: process.env.LA_E2E_CLI_EVIDENCE_DIR,
    invocation: process.env.LA_E2E_CLI_EVIDENCE_INVOCATION,
    enabled: process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED,
  };
  const { initializeSuiteEvidenceManifest, manifestFileName, readEvidenceManifest } =
    require('../../../scripts/vscode-e2e-evidence-manifest') as {
      initializeSuiteEvidenceManifest: (options: {
        suiteId: string;
        invocation: string;
        platform: string;
        evidenceDir: string;
      }) => void;
      manifestFileName: string;
      readEvidenceManifest: (manifestPath: string) => {
        attachments: Array<{ id: string; evidence?: { screenshot?: { path: string; sha256: string } } }>;
      };
    };
  const invocation = 'regeneration-screenshot-ownership-unit';
  const workspaceFilePath = path.join(screenshotDir, 'unit-workspace.code-workspace');
  const appDir = path.join(screenshotDir, 'unit-app');
  const foreignParent = path.join(screenshotDir, 'foreign');
  const foreignWorkspace = path.join(foreignParent, path.basename(workspaceFilePath));
  const foreignRoot = path.join(foreignParent, path.basename(appDir));
  fs.mkdirSync(appDir);
  fs.mkdirSync(foreignRoot, { recursive: true });
  fs.writeFileSync(workspaceFilePath, '{}');
  fs.writeFileSync(foreignWorkspace, '{}');
  const expectation = { workspaceFilePath, rootPaths: [appDir] };
  const attachments = () => readEvidenceManifest(path.join(evidenceDir, manifestFileName)).attachments.map((entry) => entry.id);

  try {
    initializeSuiteEvidenceManifest({ suiteId: 'unitTests', invocation, platform: process.platform, evidenceDir });
    process.env.LA_E2E_CLI_EVIDENCE_DIR = evidenceDir;
    process.env.LA_E2E_CLI_EVIDENCE_INVOCATION = invocation;
    delete process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED;

    const cases: Array<{
      name: string;
      options?: ConstructorParameters<typeof FakeRegenerationScreenshotCdp>[0];
      admittedTimeOrigin?: number | null;
      admittedGeneration?: number | null;
      admittedTargetId?: string | null;
      admittedDocument?: 'valid' | 'invalid' | 'wrong-target';
      invalidateDocumentDuringCapture?: boolean;
      physicalFault?: PhysicalIdentityFault;
      noAuthority?: boolean;
      replacePathDuringCapture?: 'file' | 'root';
      attempts: number;
      reason?: 'capture-unavailable' | 'document-changed';
    }> = [
      { name: 'owned', attempts: 1 },
      { name: 'root-before', options: { faults: { 1: 'foreign-root' } }, attempts: 0, reason: 'capture-unavailable' },
      { name: 'root-after', options: { faults: { 2: 'foreign-root' } }, attempts: 1, reason: 'capture-unavailable' },
      { name: 'title-before', options: { faults: { 1: 'foreign-title' } }, attempts: 0, reason: 'capture-unavailable' },
      { name: 'document-before', options: { faults: { 1: 'different-document' } }, attempts: 0, reason: 'document-changed' },
      { name: 'document-after', options: { faults: { 2: 'different-document' } }, attempts: 1, reason: 'document-changed' },
      { name: 'invalid-origin', options: { faults: { 2: 'invalid-time-origin' } }, attempts: 1, reason: 'document-changed' },
      { name: 'generation-before', options: { faults: { 1: 'generation-change' } }, attempts: 0, reason: 'document-changed' },
      { name: 'generation-during', options: { changeGenerationOnCapture: 1 }, attempts: 1, reason: 'document-changed' },
      { name: 'generation-after', options: { faults: { 2: 'generation-change' } }, attempts: 1, reason: 'document-changed' },
      { name: 'target-during', options: { changeTargetOnCapture: 1 }, attempts: 1, reason: 'document-changed' },
      { name: 'no-generation', options: { missingGeneration: true }, attempts: 0, reason: 'capture-unavailable' },
      { name: 'no-admitted-document', admittedTimeOrigin: null, attempts: 0, reason: 'capture-unavailable' },
      { name: 'no-admitted-generation', admittedGeneration: null, attempts: 0, reason: 'capture-unavailable' },
      { name: 'generation-changed-since-admission', admittedGeneration: 0, attempts: 0, reason: 'document-changed' },
      { name: 'tracked-child-churn-before-capture', admittedGeneration: 0, admittedDocument: 'valid', attempts: 1 },
      { name: 'tracked-main-document-changed', admittedDocument: 'invalid', attempts: 0, reason: 'document-changed' },
      { name: 'tracked-document-wrong-target', admittedDocument: 'wrong-target', attempts: 0, reason: 'document-changed' },
      {
        name: 'tracked-document-changed-during-capture',
        admittedDocument: 'valid',
        invalidateDocumentDuringCapture: true,
        attempts: 1,
        reason: 'document-changed',
      },
      { name: 'no-admitted-target', admittedTargetId: null, attempts: 0, reason: 'capture-unavailable' },
      { name: 'target-changed-since-admission', admittedTargetId: 'original-target', attempts: 0, reason: 'document-changed' },
      { name: 'read-error-before', options: { faults: { 1: 'read-error' } }, attempts: 0, reason: 'capture-unavailable' },
      { name: 'read-error-after', options: { faults: { 2: 'read-error' } }, attempts: 1, reason: 'capture-unavailable' },
      { name: 'product-never-activated-no-authority', noAuthority: true, attempts: 0, reason: 'capture-unavailable' },
      {
        name: 'same-name-foreign-workspace-before',
        physicalFault: 'foreign-workspace-before',
        attempts: 0,
        reason: 'capture-unavailable',
      },
      { name: 'same-name-foreign-root-before', physicalFault: 'foreign-root-before', attempts: 0, reason: 'capture-unavailable' },
      {
        name: 'same-name-foreign-workspace-after',
        physicalFault: 'foreign-workspace-after',
        attempts: 1,
        reason: 'capture-unavailable',
      },
      { name: 'same-name-foreign-root-after', physicalFault: 'foreign-root-after', attempts: 1, reason: 'capture-unavailable' },
      { name: 'lease-invalidated-during', physicalFault: 'lease-invalidated-during', attempts: 1, reason: 'document-changed' },
      { name: 'root-change-during', physicalFault: 'root-change-during', attempts: 1, reason: 'capture-unavailable' },
      {
        name: 'lease-invalidated-and-renderer-changed',
        physicalFault: 'lease-invalidated-and-renderer-changed',
        attempts: 1,
        reason: 'document-changed',
      },
      { name: 'renderer-id-change-during', physicalFault: 'renderer-id-change-during', attempts: 1, reason: 'document-changed' },
      { name: 'missing-physical-root', physicalFault: 'missing-root', attempts: 0, reason: 'capture-unavailable' },
      { name: 'wrong-physical-target', physicalFault: 'wrong-target', attempts: 0, reason: 'capture-unavailable' },
      { name: 'identity-getter-error-before', physicalFault: 'lease-getter-error-before', attempts: 0, reason: 'capture-unavailable' },
      { name: 'identity-getter-error-after', physicalFault: 'lease-getter-error-after', attempts: 1, reason: 'capture-unavailable' },
      { name: 'identity-read-error-before', physicalFault: 'lease-read-error-before', attempts: 0, reason: 'capture-unavailable' },
      { name: 'identity-read-error-after', physicalFault: 'lease-read-error-after', attempts: 1, reason: 'capture-unavailable' },
      { name: 'identity-arm-timeout', physicalFault: 'arm-timeout', attempts: 0, reason: 'capture-unavailable' },
      { name: 'identity-read-timeout', physicalFault: 'read-timeout', attempts: 0, reason: 'capture-unavailable' },
      { name: 'workspace-file-replaced-during', replacePathDuringCapture: 'file', attempts: 1, reason: 'document-changed' },
      { name: 'root-directory-replaced-during', replacePathDuringCapture: 'root', attempts: 1, reason: 'document-changed' },
    ];
    for (const test of cases) {
      const name = `guarded-${test.name}`;
      const identity = fakePhysicalIdentity(workspaceFilePath, appDir, foreignWorkspace, foreignRoot, test.physicalFault);
      const admittedDocument = test.admittedDocument
        ? {
            targetId: test.admittedDocument === 'wrong-target' ? 'other-target' : 'unit-workbench-target',
            invalidated: test.admittedDocument === 'invalid',
            dispose: () => undefined,
          }
        : undefined;
      const replacePath = test.replacePathDuringCapture === 'file' ? workspaceFilePath : appDir;
      const savedPath = `${replacePath}-saved`;
      const cdp = new FakeRegenerationScreenshotCdp({
        ...test.options,
        onCapture: () => {
          test.options?.onCapture?.();
          identity.onCapture();
          if (test.invalidateDocumentDuringCapture && admittedDocument) {
            admittedDocument.invalidated = true;
          }
          if (test.replacePathDuringCapture) {
            fs.renameSync(replacePath, savedPath);
            if (test.replacePathDuringCapture === 'file') {
              fs.writeFileSync(replacePath, '{}');
            } else {
              fs.mkdirSync(replacePath);
            }
          }
        },
      });
      const writes: string[] = [];
      const registrations: string[] = [];
      let failure: unknown;
      if (test.name === 'root-after') {
        fs.writeFileSync(path.join(screenshotDir, `${name}.png`), Buffer.from('stale-pixels'));
      }
      const restore = setScreenshotFileSystemForTests({
        writeFileSync: (file, data) => {
          writes.push(String(file));
          if (String(file).endsWith('.png')) {
            cdp.events.push('png-write');
          }
          fs.writeFileSync(file, data);
        },
      });
      try {
        const file = await captureCdpScreenshot(cdp, name, {
          classification: 'diagnostic',
          captureBeforeObservation: true,
          immediateCaptureOwnership: {
            expectation,
            expectedTargetId: test.admittedTargetId === null ? undefined : (test.admittedTargetId ?? 'unit-workbench-target'),
            expectedTimeOrigin: test.admittedTimeOrigin === null ? undefined : (test.admittedTimeOrigin ?? 42),
            expectedContextGeneration: test.admittedGeneration === null ? undefined : (test.admittedGeneration ?? 1),
            admittedDocument,
            physicalIdentity: test.noAuthority ? undefined : identity.authority,
          },
          expectation: { kind: 'diagnostic', label: name, reason: 'regeneration-phase-failure' },
          timeoutMs: test.physicalFault === 'arm-timeout' || test.physicalFault === 'read-timeout' ? 50 : 2000,
          onDiagnosticFailure: (error) => {
            failure = error;
          },
          onOrderedEvidenceStatus: (status) => registrations.push(status),
        });
        assert.strictEqual(cdp.captureAttempts, test.attempts, name);
        if (test.reason) {
          assert.strictEqual(file, undefined, name);
          assert.deepStrictEqual(writes, [], `${name} must not write even a stale/failed diagnostic attachment`);
          assert.deepStrictEqual(registrations, [], `${name} must not register the unowned capture`);
          assert.strictEqual(fs.existsSync(path.join(screenshotDir, `${name}.png`)), false, name);
          assert.strictEqual(attachments().includes(name), false, name);
          if (test.physicalFault === 'arm-timeout') {
            assert.strictEqual((failure as Error)?.name, 'ScreenshotCaptureCleanupError', name);
          } else {
            assert.strictEqual((failure as { reason?: string })?.reason, test.reason, name);
          }
          assert.ok(!String(failure).includes('private-workspace-read-error'), 'Ownership failures must not expose raw CDP errors');
          assert.ok(!String(failure).includes('private-physical-identity-error'), 'Identity failures must not expose raw bridge errors');
        } else {
          assert.ok(file && fs.existsSync(file));
          assert.deepStrictEqual(cdp.events.slice(0, 4), ['owner:1', 'capture:1', 'owner:2', 'png-write']);
          assert.deepStrictEqual(registrations, ['registered']);
          assert.ok(attachments().includes(name));
          assert.ok(!fs.readFileSync(path.join(screenshotDir, `${name}.json`), 'utf8').includes(workspaceFilePath));
          assert.ok(!fs.readFileSync(path.join(screenshotDir, `${name}.json`), 'utf8').includes(appDir));
        }
      } finally {
        restore();
        if (test.replacePathDuringCapture && fs.existsSync(savedPath)) {
          fs.rmSync(replacePath, { recursive: true, force: true });
          fs.renameSync(savedPath, replacePath);
        }
      }
    }

    let resolveLateLease: ((lease: PhysicalWorkspaceIdentityLease) => void) | undefined;
    let lateLeaseDisposed = false;
    const lateAuthority: PhysicalWorkspaceIdentityAuthority = {
      arm: async () => new Promise((resolve) => (resolveLateLease = resolve)),
    };
    const lateCdp = new FakeRegenerationScreenshotCdp();
    const lateRegistrations: string[] = [];
    let lateFailure: unknown;
    const lateFile = await captureCdpScreenshot(lateCdp, 'guarded-late-identity', {
      classification: 'diagnostic',
      captureBeforeObservation: true,
      immediateCaptureOwnership: {
        expectation,
        expectedTargetId: 'unit-workbench-target',
        expectedTimeOrigin: 42,
        expectedContextGeneration: 1,
        physicalIdentity: lateAuthority,
      },
      expectation: { kind: 'diagnostic', label: 'guarded-late-identity', reason: 'regeneration-phase-failure' },
      timeoutMs: 50,
      onDiagnosticFailure: (error) => {
        lateFailure = error;
      },
      onOrderedEvidenceStatus: (status) => lateRegistrations.push(status),
    });
    assert.strictEqual(lateFile, undefined);
    assert.strictEqual(lateCdp.captureAttempts, 0);
    assert.deepStrictEqual(lateRegistrations, []);
    assert.strictEqual(attachments().includes('guarded-late-identity'), false);
    assert.strictEqual((lateFailure as Error)?.name, 'ScreenshotCaptureCleanupError');
    resolveLateLease?.({
      invalidated: false,
      read: async () => {
        throw new Error('late identity must not be read');
      },
      dispose: () => {
        lateLeaseDisposed = true;
      },
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.strictEqual(lateLeaseDisposed, true, 'An identity lease arriving after timeout must be disposed');

    let now = Date.now();
    const clock = mock.method(Date, 'now', () => now);
    const expiredIdentity = fakePhysicalIdentity(workspaceFilePath, appDir, foreignWorkspace, foreignRoot);
    const expiredCdp = new FakeRegenerationScreenshotCdp({ onCapture: () => (now += 3000) });
    const expiredWrites: string[] = [];
    let expiredFailure: unknown;
    const restoreExpired = setScreenshotFileSystemForTests({
      writeFileSync: (file, data) => {
        expiredWrites.push(String(file));
        fs.writeFileSync(file, data);
      },
    });
    try {
      const file = await captureCdpScreenshot(expiredCdp, 'guarded-expired-after-capture', {
        classification: 'diagnostic',
        captureBeforeObservation: true,
        immediateCaptureOwnership: {
          expectation,
          expectedTargetId: 'unit-workbench-target',
          expectedTimeOrigin: 42,
          expectedContextGeneration: 1,
          physicalIdentity: expiredIdentity.authority,
        },
        expectation: { kind: 'diagnostic', label: 'guarded-expired-after-capture', reason: 'regeneration-phase-failure' },
        timeoutMs: 2000,
        onDiagnosticFailure: (error) => {
          expiredFailure = error;
        },
      });
      assert.strictEqual(file, undefined);
      assert.strictEqual(expiredCdp.captureAttempts, 1);
      assert.deepStrictEqual(expiredWrites, [], 'Pixels returned after the capture deadline must not be persisted');
      assert.strictEqual(attachments().includes('guarded-expired-after-capture'), false);
      assert.strictEqual((expiredFailure as { reason?: string })?.reason, 'capture-unavailable');
    } finally {
      restoreExpired();
      clock.mock.restore();
    }

    const metadataFailureCdp = new FakeRegenerationScreenshotCdp();
    const metadataIdentity = fakePhysicalIdentity(workspaceFilePath, appDir, foreignWorkspace, foreignRoot);
    let firstMetadataWrite = true;
    const restoreMetadataFailure = setScreenshotFileSystemForTests({
      writeFileSync: (file, data) => {
        if (String(file).endsWith('.json') && firstMetadataWrite) {
          firstMetadataWrite = false;
          throw new Error('unit-metadata-write-failure');
        }
        fs.writeFileSync(file, data);
      },
    });
    try {
      const file = await captureCdpScreenshot(metadataFailureCdp, 'guarded-verified-metadata-failure', {
        classification: 'diagnostic',
        captureBeforeObservation: true,
        immediateCaptureOwnership: {
          expectation,
          expectedTargetId: 'unit-workbench-target',
          expectedTimeOrigin: 42,
          expectedContextGeneration: 1,
          physicalIdentity: metadataIdentity.authority,
        },
        expectation: { kind: 'diagnostic', label: 'guarded-verified-metadata-failure', reason: 'regeneration-phase-failure' },
        timeoutMs: 2000,
      });
      assert.ok(file && fs.existsSync(file), 'A later metadata failure may preserve only already-verified pixels');
      assert.deepStrictEqual(metadataFailureCdp.events.slice(0, 3), ['owner:1', 'capture:1', 'owner:2']);
      assert.ok(attachments().includes('guarded-verified-metadata-failure'));
    } finally {
      restoreMetadataFailure();
    }

    for (const failMetadata of [false, true]) {
      const name = `guarded-verified-bytes-${failMetadata ? 'fallback' : 'normal'}`;
      const cdp = new FakeRegenerationScreenshotCdp();
      const identity = fakePhysicalIdentity(workspaceFilePath, appDir, foreignWorkspace, foreignRoot);
      let metadataFailurePending = failMetadata;
      const restore = setScreenshotFileSystemForTests({
        writeFileSync: (file, data) => {
          if (String(file).endsWith('.json') && metadataFailurePending) {
            metadataFailurePending = false;
            throw new Error('unit-metadata-write-failure');
          }
          fs.writeFileSync(file, data);
          if (String(file).endsWith('.png')) {
            fs.writeFileSync(file, Buffer.from('foreign-pixels'));
          }
        },
      });
      try {
        const file = await captureCdpScreenshot(cdp, name, {
          classification: 'diagnostic',
          captureBeforeObservation: true,
          immediateCaptureOwnership: {
            expectation,
            expectedTargetId: 'unit-workbench-target',
            expectedTimeOrigin: 42,
            expectedContextGeneration: 1,
            physicalIdentity: identity.authority,
          },
          expectation: { kind: 'diagnostic', label: name, reason: 'regeneration-phase-failure' },
          timeoutMs: 2000,
        });
        assert.ok(file);
        assert.deepStrictEqual(fs.readFileSync(file), Buffer.from('foreign-pixels'));
        const attachment = readEvidenceManifest(path.join(evidenceDir, manifestFileName)).attachments.find((entry) => entry.id === name);
        assert.ok(attachment?.evidence?.screenshot);
        const reference = attachment.evidence.screenshot;
        const bundled = fs.readFileSync(path.join(evidenceDir, ...reference.path.split('/')));
        assert.deepStrictEqual(bundled, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]));
      } finally {
        restore();
      }
    }

    const state = (centerVisible: boolean) => ({
      shellOwned: true,
      documentVisible: true,
      documentFocused: true,
      documentChanged: false,
      centerMounted: centerVisible,
      centerVisible,
      toastCount: 0,
      retainedCount: centerVisible ? 4 : 0,
      dnd: 'unknown',
      blockingUiVisible: false,
      truncated: false,
      candidates: centerVisible ? [{ kind: 'notification', category: 'initialization', yesCount: 1, reasonCodes: ['obstructed-yes'] }] : [],
    });
    const hostCases: Array<{
      name: string;
      options?: ConstructorParameters<typeof FakeRegenerationScreenshotCdp>[0];
      physicalFault?: PhysicalIdentityFault;
      noAuthority?: boolean;
      uncertainInput?: boolean;
      modal?: 'before';
      centerClosed?: boolean;
      diagnosticInput?: boolean;
      first: 'captured' | 'unavailable';
      center: 'captured' | 'unavailable' | 'skipped';
      reason?: 'capture-unavailable' | 'document-changed' | 'uncertain-input' | 'renderer-cleanup-failed';
      centerReason?: string;
      attempts: number;
    }> = [
      { name: 'center-retained-obstructed-yes', first: 'captured', center: 'captured', attempts: 2 },
      {
        name: 'renderer-cleanup-failed',
        physicalFault: 'cleanup-failed',
        first: 'captured',
        center: 'unavailable',
        reason: 'renderer-cleanup-failed',
        attempts: 1,
      },
      {
        name: 'renderer-arm-timeout-leaves-cleanup-unconfirmed',
        physicalFault: 'arm-timeout',
        first: 'unavailable',
        center: 'unavailable',
        reason: 'capture-unavailable',
        centerReason: 'renderer-cleanup-failed',
        attempts: 0,
      },
      {
        name: 'center-renderer-cleanup-failed',
        physicalFault: 'cleanup-failed-center',
        first: 'captured',
        center: 'captured',
        centerReason: 'renderer-cleanup-failed',
        attempts: 2,
      },
      {
        name: 'uncertain-input',
        uncertainInput: true,
        first: 'unavailable',
        center: 'unavailable',
        reason: 'uncertain-input',
        attempts: 0,
      },
      {
        name: 'no-identity-bridge',
        noAuthority: true,
        first: 'unavailable',
        center: 'unavailable',
        reason: 'capture-unavailable',
        attempts: 0,
      },
      {
        name: 'same-name-foreign-root',
        physicalFault: 'foreign-root-before',
        first: 'unavailable',
        center: 'unavailable',
        reason: 'capture-unavailable',
        attempts: 0,
      },
      {
        name: 'first-unowned-before',
        options: { faults: { 1: 'foreign-root' } },
        first: 'unavailable',
        center: 'unavailable',
        reason: 'capture-unavailable',
        attempts: 0,
      },
      {
        name: 'first-unowned-after',
        options: { faults: { 2: 'foreign-root' } },
        first: 'unavailable',
        center: 'unavailable',
        reason: 'capture-unavailable',
        attempts: 1,
      },
      {
        name: 'blocking-dialog-before',
        modal: 'before',
        first: 'captured',
        center: 'skipped',
        centerReason: 'blocking-or-ambiguous-ui',
        attempts: 1,
      },
      {
        name: 'closed-center-is-revealed-diagnostically',
        centerClosed: true,
        first: 'captured',
        center: 'captured',
        attempts: 2,
        diagnosticInput: true,
      },
      {
        name: 'center-unowned-before',
        options: { faults: { 3: 'foreign-root' } },
        first: 'captured',
        center: 'unavailable',
        reason: 'capture-unavailable',
        attempts: 1,
      },
      {
        name: 'center-same-name-foreign-workspace-before',
        physicalFault: 'foreign-workspace-center-before',
        first: 'captured',
        center: 'unavailable',
        reason: 'capture-unavailable',
        attempts: 1,
      },
      {
        name: 'center-same-name-foreign-root-after',
        physicalFault: 'foreign-root-center-after',
        first: 'captured',
        center: 'unavailable',
        reason: 'capture-unavailable',
        attempts: 2,
      },
      {
        name: 'center-lease-invalidated',
        physicalFault: 'lease-invalidated-during-center',
        first: 'captured',
        center: 'unavailable',
        reason: 'document-changed',
        attempts: 2,
      },
      {
        name: 'center-lease-invalidated-and-renderer-changed',
        physicalFault: 'lease-invalidated-and-renderer-changed-center',
        first: 'captured',
        center: 'unavailable',
        reason: 'document-changed',
        attempts: 2,
      },
      {
        name: 'center-unowned-after',
        options: { faults: { 4: 'foreign-root' } },
        first: 'captured',
        center: 'unavailable',
        reason: 'capture-unavailable',
        attempts: 2,
      },
      {
        name: 'center-document-after',
        options: { faults: { 4: 'different-document' } },
        first: 'captured',
        center: 'unavailable',
        reason: 'document-changed',
        attempts: 2,
      },
      {
        name: 'center-generation-during',
        options: { changeGenerationOnCapture: 2 },
        first: 'captured',
        center: 'unavailable',
        reason: 'document-changed',
        attempts: 2,
      },
    ];
    type CaptureArgs = Parameters<typeof captureRegenerationFailureDiagnostics>;
    for (const test of hostCases) {
      const identity = fakePhysicalIdentity(workspaceFilePath, appDir, foreignWorkspace, foreignRoot, test.physicalFault);
      const cdp = new FakeRegenerationScreenshotCdp({
        ...test.options,
        onCapture: () => {
          test.options?.onCapture?.();
          identity.onCapture();
        },
      });
      const initialStatus = () => ({
        status: 'unavailable',
        reason: 'not-attempted',
        checkpoint: null as string | null,
        postDeadline: false,
        registration: 'unavailable',
      });
      let samples = 0;
      const inspections: Record<string, unknown>[] = [];
      const diagnostics = {
        screenshots: { beforeTeardown: initialStatus(), notificationCenter: initialStatus() },
        input: {
          uncertain: test.uncertainInput ?? false,
          pending: 0,
          send: async <T>(_method: string, action: () => Promise<T>) => action(),
        },
        recordNotificationCenterInspection: (inspection: Record<string, unknown>) => {
          inspections.push(inspection);
        },
        stopSampling: async () => undefined,
        stopAndSample: async () => {
          cdp.events.push(`sample:${++samples}`);
          if (test.first === 'unavailable') {
            return undefined;
          }
          return {
            ...state(!test.centerClosed),
            blockingUiVisible: test.modal === 'before',
          };
        },
        hasSampleSince: () => true,
      };
      const phaseName = `unit-${test.name}`;
      const firstName = `workspace-regeneration-${phaseName}-failure`;
      const centerName = `workspace-regeneration-${phaseName}-notification-center`;
      const restore = setScreenshotFileSystemForTests({
        writeFileSync: (file, data) => {
          if (String(file).endsWith('.png')) {
            cdp.events.push(`png:${path.basename(String(file), '.png')}`);
          }
          fs.writeFileSync(file, data);
        },
      });
      try {
        const decisionAt = Date.now();
        await captureRegenerationFailureDiagnostics(
          cdp as unknown as CaptureArgs[0],
          diagnostics as unknown as CaptureArgs[1],
          { invocation } as CaptureArgs[2],
          { workspace: { appDir, workspaceFilePath } } as CaptureArgs[3],
          { phase: phaseName, startedAt: decisionAt - 120_001, deadline: decisionAt - 1 },
          decisionAt,
          42,
          1,
          'unit-workbench-target',
          test.noAuthority ? undefined : identity.authority,
          undefined,
          undefined,
          async ({ input }) => {
            if (test.diagnosticInput) {
              await input.send('Input.dispatchMouseEvent', async () => {
                cdp.events.push('Input.dispatchMouseEvent');
                return {};
              });
            }
            return {
              availability: 'available',
              target: test.centerClosed ? 'absent' : 'retained',
              reason: 'inspected',
              retainedCount: test.centerClosed ? 0 : 4,
              targetInitializationCount: test.centerClosed ? 0 : 1,
              otherProjectCount: 0,
              sampleCount: 1,
              scrollCount: 0,
              truncated: false,
              bottomVerified: Boolean(test.centerClosed),
              openedByDiagnostic: Boolean(test.centerClosed),
            };
          }
        );
        const { beforeTeardown: first, notificationCenter: center } = diagnostics.screenshots;
        assert.strictEqual(first.status, test.first, test.name);
        assert.strictEqual(center.status, test.center, test.name);
        assert.strictEqual(cdp.captureAttempts, test.attempts, test.name);
        assert.strictEqual(
          cdp.events.filter((event) => event.startsWith('Input.')).length,
          test.diagnosticInput ? 1 : 0,
          `${test.name} diagnostic input count`
        );
        assert.strictEqual(inspections.length, 1, `${test.name} must retain one fixed inspection result`);
        for (const [status, name] of [
          [first, firstName],
          [center, centerName],
        ] as const) {
          const captured = status.status === 'captured';
          assert.strictEqual(fs.existsSync(path.join(screenshotDir, `${name}.png`)), captured, name);
          assert.strictEqual(attachments().includes(name), captured, name);
          assert.strictEqual(status.registration, captured ? 'registered' : 'unavailable', name);
          assert.strictEqual(status.postDeadline, true, 'Diagnostics do not extend the expired acceptance deadline');
        }
        const unavailable = first.status === 'unavailable' ? first : center.status === 'unavailable' ? center : undefined;
        if (unavailable) {
          assert.strictEqual(unavailable.reason, test.reason, test.name);
        }
        if (test.centerReason) {
          assert.strictEqual(center.reason, test.centerReason, test.name);
        }
        if (test.first === 'captured') {
          assert.ok(cdp.events.indexOf('owner:1') < cdp.events.indexOf('capture:1'));
          assert.ok(cdp.events.indexOf('capture:1') < cdp.events.indexOf('owner:2'));
          assert.ok(cdp.events.indexOf('owner:2') < cdp.events.indexOf(`png:${firstName}`));
        }
        if (test.center === 'captured') {
          assert.ok(cdp.events.indexOf('sample:1') < cdp.events.indexOf('owner:3'));
          assert.ok(cdp.events.indexOf('owner:3') < cdp.events.indexOf('capture:2'));
          assert.ok(cdp.events.indexOf('capture:2') < cdp.events.indexOf('owner:4'));
          assert.ok(cdp.events.indexOf('owner:4') < cdp.events.indexOf(`png:${centerName}`));
        }
        if (test.diagnosticInput) {
          assert.ok(cdp.events.indexOf(`png:${firstName}`) < cdp.events.indexOf('Input.dispatchMouseEvent'));
          assert.ok(cdp.events.indexOf('Input.dispatchMouseEvent') < cdp.events.indexOf('capture:2'));
        }
      } finally {
        restore();
      }
    }
  } finally {
    for (const [key, value] of [
      ['LA_E2E_CLI_EVIDENCE_DIR', previous.dir],
      ['LA_E2E_CLI_EVIDENCE_INVOCATION', previous.invocation],
      ['LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED', previous.enabled],
    ] as const) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
}

async function testImmediateDiagnosticSurvivesMetadataFailure(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  setScreenshotFileSystemForTests: typeof import('./screenshot').setScreenshotFileSystemForTests,
  screenshotDir: string
): Promise<void> {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
  const methods: string[] = [];
  const cdp = {
    targetId: 'owned-unit-target',
    contextGeneration: 1,
    send: async (method: string) => {
      methods.push(method);
      return method === 'Page.captureScreenshot' ? { result: { data: png.toString('base64') } } : { result: {} };
    },
    evaluate: async () => {
      throw new Error('private-readiness-error');
    },
  };
  let firstMetadataWrite = true;
  const restore = setScreenshotFileSystemForTests({
    writeFileSync: (file, data) => {
      if (String(file).endsWith('.json') && firstMetadataWrite) {
        firstMetadataWrite = false;
        throw new Error('unit-metadata-write-failure');
      }
      fs.writeFileSync(file, data);
    },
  });
  let failed = false;
  let registration = '';
  let captureStartedAt = 0;
  const previousEnabled = process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED;
  process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED = '0';
  try {
    const file = await captureCdpScreenshot(cdp, 'unit-immediate-preserved', {
      classification: 'diagnostic',
      captureBeforeObservation: true,
      expectation: { kind: 'diagnostic', label: 'unit-immediate-preserved', reason: 'unit' },
      timeoutMs: 2000,
      onDiagnosticFailure: () => {
        failed = true;
      },
      onImmediateCaptureStart: (value) => {
        captureStartedAt = value;
      },
      onOrderedEvidenceStatus: (value) => {
        registration = value;
      },
    });
    assert.strictEqual(file, path.join(screenshotDir, 'unit-immediate-preserved.png'));
    assert.deepStrictEqual(fs.readFileSync(file!), png);
    assert.strictEqual(methods[0], 'Page.captureScreenshot', 'Other immediate diagnostics must remain capture-first');
    assert.strictEqual(failed, true);
    assert.ok(captureStartedAt > 0 && captureStartedAt <= Date.now());
    assert.strictEqual(registration, 'not-configured');
    const metadata = JSON.parse(fs.readFileSync(file!.replace(/\.png$/, '.json'), 'utf8'));
    assert.ok(metadata.reasonCodes.includes('metadata-after-capture-failed'));
    assert.strictEqual(metadata.verdict, 'diagnostic');
  } finally {
    restore();
    if (previousEnabled === undefined) {
      delete process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED;
    } else {
      process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED = previousEnabled;
    }
  }
}

async function testDiagnosticOrderedRegistrationFailureIsReported(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  screenshotDir: string
): Promise<void> {
  const previousDir = process.env.LA_E2E_CLI_EVIDENCE_DIR;
  const previousInvocation = process.env.LA_E2E_CLI_EVIDENCE_INVOCATION;
  const previousEnabled = process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED;
  process.env.LA_E2E_CLI_EVIDENCE_DIR = path.join(screenshotDir, 'missing-manifest');
  process.env.LA_E2E_CLI_EVIDENCE_INVOCATION = 'unit-invocation';
  delete process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED;
  let registration = '';
  try {
    const file = await captureCdpScreenshot(
      {
        targetId: 'owned-unit-target',
        send: async (method: string) =>
          method === 'Page.captureScreenshot' ? { result: { data: Buffer.from('unit-png').toString('base64') } } : { result: {} },
        evaluate: async () => {
          throw new Error('private-readiness-error');
        },
      },
      'unit-registration-unavailable',
      {
        classification: 'diagnostic',
        captureBeforeObservation: true,
        expectation: { kind: 'diagnostic', label: 'unit-registration-unavailable', reason: 'unit' },
        timeoutMs: 2000,
        onOrderedEvidenceStatus: (value) => {
          registration = value;
        },
      }
    );
    assert.ok(file && fs.existsSync(file));
    assert.strictEqual(registration, 'unavailable', 'Missing ordered evidence must be explicitly reported');
  } finally {
    if (previousDir === undefined) {
      delete process.env.LA_E2E_CLI_EVIDENCE_DIR;
    } else {
      process.env.LA_E2E_CLI_EVIDENCE_DIR = previousDir;
    }
    if (previousInvocation === undefined) {
      delete process.env.LA_E2E_CLI_EVIDENCE_INVOCATION;
    } else {
      process.env.LA_E2E_CLI_EVIDENCE_INVOCATION = previousInvocation;
    }
    if (previousEnabled === undefined) {
      delete process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED;
    } else {
      process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED = previousEnabled;
    }
  }
}

async function testStaleDiagnosticImageIsNotCurrentCapture(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  setScreenshotFileSystemForTests: typeof import('./screenshot').setScreenshotFileSystemForTests,
  screenshotDir: string
): Promise<void> {
  const stalePath = path.join(screenshotDir, 'unit-stale-capture.png');
  fs.writeFileSync(stalePath, Buffer.from('stale-pixels'));
  let captureAttempts = 0;
  const restore = setScreenshotFileSystemForTests({
    rmSync: (file, options) => {
      if (String(file) !== stalePath) {
        fs.rmSync(file, options);
      }
    },
    writeFileSync: (file, data) => {
      if (String(file).endsWith('.json')) {
        throw new Error('unit-metadata-write-failure');
      }
      fs.writeFileSync(file, data);
    },
  });
  try {
    const file = await captureCdpScreenshot(
      {
        targetId: 'owned-unit-target',
        send: async (method: string) => {
          if (method === 'Page.captureScreenshot') {
            captureAttempts++;
            throw new Error('unit-cdp-capture-failure');
          }
          return { result: {} };
        },
        evaluate: async () => {
          throw new Error('unit-readiness-failure');
        },
      },
      'unit-stale-capture',
      {
        classification: 'diagnostic',
        captureBeforeObservation: true,
        expectation: { kind: 'diagnostic', label: 'unit-stale-capture', reason: 'unit' },
        timeoutMs: 2000,
      }
    );
    assert.strictEqual(captureAttempts, 1);
    assert.strictEqual(file, undefined, 'A stale PNG cannot be credited to a failed current CDP capture');
    assert.strictEqual(fs.readFileSync(stalePath, 'utf8'), 'stale-pixels');
  } finally {
    restore();
  }
}

function testDiagnosticCheckpointNormalization(sanitizeDiagnosticCheckpointId: (value: string) => string): void {
  const prefix = 'failure-runAfterPersistenceLifecycle-Run After Settings should persist_';
  const checkpoint = sanitizeDiagnosticCheckpointId(`${prefix}${'x'.repeat(220)}`);
  const differentCheckpoint = sanitizeDiagnosticCheckpointId(`${prefix}${'y'.repeat(220)}`);
  assert.match(checkpoint, /^[a-z0-9][a-z0-9-]{0,199}$/);
  assert.ok(!checkpoint.includes('_'));
  assert.strictEqual(checkpoint, checkpoint.toLowerCase());
  assert.notStrictEqual(checkpoint, differentCheckpoint);
}

async function testAcceptedCaptureUpdatesOrderedEvidenceManifest(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-screenshot-evidence-unit-'));
  const previousEvidenceDir = process.env.LA_E2E_CLI_EVIDENCE_DIR;
  const previousEvidenceInvocation = process.env.LA_E2E_CLI_EVIDENCE_INVOCATION;
  const previousEvidenceEnabled = process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED;
  const { initializeSuiteEvidenceManifest, manifestFileName, readEvidenceManifest } =
    require('../../../scripts/vscode-e2e-evidence-manifest') as {
      initializeSuiteEvidenceManifest: (options: {
        suiteId: string;
        invocation: string;
        platform: string;
        evidenceDir: string;
      }) => unknown;
      manifestFileName: string;
      readEvidenceManifest: (manifestPath: string) => {
        attachments: Array<{ id: string }>;
        groups: Array<{
          checkpoints: Array<{
            id: string;
            status: string;
            evidence?: {
              screenshot?: { path: string };
              sidecar?: { path: string };
            };
          }>;
        }>;
      };
    };

  try {
    initializeSuiteEvidenceManifest({
      suiteId: 'unitTests',
      invocation: 'screenshot-bridge-unit',
      platform: process.platform,
      evidenceDir,
    });
    process.env.LA_E2E_CLI_EVIDENCE_DIR = evidenceDir;
    process.env.LA_E2E_CLI_EVIDENCE_INVOCATION = 'screenshot-bridge-unit';

    const cdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
    await captureCdpScreenshot(cdp, 'empty-window-startup', {
      expectation: { kind: 'workbenchShell', label: 'empty-window-startup' },
      timeoutMs: 5000,
    });

    const manifest = readEvidenceManifest(path.join(evidenceDir, manifestFileName));
    const checkpoint = manifest.groups.flatMap((group) => group.checkpoints).find((candidate) => candidate.id === 'empty-window-startup');
    assert.strictEqual(checkpoint?.status, 'accepted');
    assert.ok(checkpoint?.evidence?.screenshot?.path);
    assert.ok(checkpoint?.evidence?.sidecar?.path);
    assert.ok(fs.existsSync(path.join(evidenceDir, checkpoint?.evidence?.screenshot?.path ?? '')));
    assert.ok(fs.existsSync(path.join(evidenceDir, checkpoint?.evidence?.sidecar?.path ?? '')));

    const unexpected = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
    const diagnosticContext = {
      operationId: 'unit-unexpected-ui:1',
      nativeInvocation: 'unit-native-invocation',
      phase: 'regular-workbench-debug-root-1',
    };
    const diagnosticFile = await captureCdpScreenshot(unexpected, 'unexpected-ui-unit-owned', {
      classification: 'diagnostic',
      expectation: { kind: 'diagnostic', label: 'unexpected-ui-unit-owned', reason: 'unexpected-workbench-prompt' },
      diagnosticContext,
      timeoutMs: 5000,
    });
    assert.ok(diagnosticFile);
    const diagnosticMetadata = JSON.parse(fs.readFileSync(diagnosticFile.replace(/\.png$/, '.json'), 'utf8'));
    assert.deepStrictEqual(diagnosticMetadata.diagnosticContext, diagnosticContext);
    const withDiagnostic = readEvidenceManifest(path.join(evidenceDir, manifestFileName));
    assert.ok(withDiagnostic.attachments.some((attachment) => attachment.id === 'unexpected-ui-unit-owned'));
    assert.deepStrictEqual(
      withDiagnostic.groups,
      manifest.groups,
      'Unexpected UI image must never add/change ordered acceptance checkpoints'
    );

    process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED = '0';
    const helperCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
    await captureCdpScreenshot(helperCdp, 'helper-host-setup', {
      expectation: { kind: 'workbenchShell', label: 'helper-host-setup' },
      timeoutMs: 5000,
    });
    const unchanged = readEvidenceManifest(path.join(evidenceDir, manifestFileName));
    assert.ok(!unchanged.groups.flatMap((group) => group.checkpoints).some((candidate) => candidate.id === 'helper-host-setup'));
    assert.ok(!unchanged.attachments.some((attachment) => attachment.id === 'helper-host-setup'));
  } finally {
    if (previousEvidenceDir === undefined) {
      Reflect.deleteProperty(process.env, 'LA_E2E_CLI_EVIDENCE_DIR');
    } else {
      process.env.LA_E2E_CLI_EVIDENCE_DIR = previousEvidenceDir;
    }
    if (previousEvidenceInvocation === undefined) {
      Reflect.deleteProperty(process.env, 'LA_E2E_CLI_EVIDENCE_INVOCATION');
    } else {
      process.env.LA_E2E_CLI_EVIDENCE_INVOCATION = previousEvidenceInvocation;
    }
    if (previousEvidenceEnabled === undefined) {
      Reflect.deleteProperty(process.env, 'LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED');
    } else {
      process.env.LA_E2E_CLI_ORDERED_EVIDENCE_ENABLED = previousEvidenceEnabled;
    }
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
}

function testFailureScreenshotHookInstallsOnce(
  installFailureScreenshotHook: typeof import('./screenshot').installFailureScreenshotHook
): void {
  const globalWithTeardown = globalThis as typeof globalThis & { teardown?: (callback: unknown) => void };
  const previousTeardown = globalWithTeardown.teardown;
  let registrations = 0;
  globalWithTeardown.teardown = () => {
    registrations++;
  };
  try {
    installFailureScreenshotHook();
    installFailureScreenshotHook();
    assert.strictEqual(registrations, 1, 'Failure screenshot teardown must be registered once per extension-host process');
  } finally {
    if (previousTeardown) {
      globalWithTeardown.teardown = previousTeardown;
    } else {
      Reflect.deleteProperty(globalWithTeardown, 'teardown');
    }
  }
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
  assert.strictEqual(cdp.latchDisposeAttempts, 0, 'Expired evidence deadlines must skip best-effort semantic-latch disposal');
}

async function testReadinessUnavailableRecordsLastSampleDiagnostics(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  setScreenshotFileSystemForTests: typeof import('./screenshot').setScreenshotFileSystemForTests
): Promise<void> {
  const writes = new Map<string, string>();
  const cdp = new FakeCaptureCdp([
    {
      ready: false,
      reasonCodes: ['designer-canvas-required-node-missing'],
      blockers: [],
      anchors: [{ name: 'body', visible: true, bounds: { left: 0, top: 0, width: 100, height: 100 } }],
      viewport: { width: 100, height: 100, deviceScaleFactor: 1 },
      counts: { canvasNodes: 4 },
      generation: 0,
      revision: 0,
      structuralRevision: 0,
      scrollY: 0,
      expectationKind: 'designerCanvas',
      details: {
        designerCanvas: {
          missing: ['required-0'],
          matched: [],
          covered: ['required-1'],
        },
      },
    },
  ]);
  const restore = setScreenshotFileSystemForTests({
    writeFileSync: (filePath, data) => writes.set(filePath, Buffer.isBuffer(data) ? data.toString('utf8') : String(data)),
  });
  try {
    await assert.rejects(
      captureCdpScreenshot(cdp, 'readiness-unavailable-last-sample', {
        expectation: { kind: 'designerCanvas', label: 'readiness-unavailable-last-sample' },
        timeoutMs: 25,
      }),
      /Screenshot readiness failed/
    );
  } finally {
    restore();
  }

  const metadataText = Array.from(writes.entries()).find(([filePath]) => filePath.endsWith('readiness-unavailable-last-sample.json'))?.[1];
  assert.ok(metadataText, 'Expected failed screenshot metadata sidecar');
  const metadata = JSON.parse(metadataText);
  const readinessUnavailable = metadata.events.find((event: { name: string }) => event.name === 'readiness-unavailable');
  assert.ok(readinessUnavailable, JSON.stringify(metadata.events));
  assert.deepStrictEqual(readinessUnavailable.details.designerCanvas.missing, ['required-0']);
  const readinessSample = metadata.events.find((event: { name: string }) => event.name === 'readiness-sample');
  assert.ok(readinessSample, 'Failed stability waits must preserve sampled revisions, geometry and counts');
  assert.strictEqual(readinessSample.revision, 0);
  assert.deepStrictEqual(readinessSample.counts, { canvasNodes: 4 });
  assert.strictEqual(cdp.captureAttempts, 0, 'Timeout diagnostics must not accept or capture evidence');
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

async function testSemanticContextBindingIncludesControlMetadata(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0, expectationKind: 'discovery' })], {
    targetUrl: 'vscode-webview://logic-apps-discovery-control-metadata',
    contexts: [
      {
        id: 7,
        text: 'Add a trigger Operations panel',
        controlText: 'Search for a trigger or connector Request',
        visible: true,
        frameId: 'semantic-frame',
      },
    ],
  });

  await captureCdpScreenshot(ownerCdp, 'discovery-control-metadata-binding', {
    expectation: { kind: 'discovery', label: 'discovery-control-metadata-binding', searchText: 'Request' },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });

  assert.strictEqual(
    semanticCdp.semanticBindingControlMetadataUsed,
    true,
    'Semantic binding should include input placeholder/control metadata, not only body innerText'
  );
}

async function testDiscoverySemanticContextWaitsForReadyPhase(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp(
    [snapshot({ revision: 0, expectationKind: 'discovery' }), snapshot({ revision: 0, expectationKind: 'discovery' })],
    {
      targetUrl: 'vscode-webview://logic-apps-discovery-transition',
      contexts: [{ id: 7, text: 'Add a trigger Operations panel loading', visible: true, frameId: 'semantic-frame' }],
    }
  );

  await captureCdpScreenshot(ownerCdp, 'discovery-transition-same-frame', {
    expectation: { kind: 'discovery', label: 'discovery-transition-same-frame', searchText: 'Request' },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });

  assert.deepStrictEqual(
    semanticCdp.latchInstallContextIds,
    [7],
    'Visible same-frame discovery should keep the original context while readiness waits'
  );
}

async function testDiscoverySemanticContextWithoutVisibleControlRejects(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0, expectationKind: 'discovery' })], {
    targetUrl: 'vscode-webview://logic-apps-empty-discovery-host',
    contexts: [
      {
        id: 7,
        text: 'Add a trigger Built-in tools Search Request',
        visible: true,
        frameId: 'semantic-frame',
        requiredSelectorFound: false,
      },
    ],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'discovery-empty-host-rejected', {
      expectation: { kind: 'discovery', label: 'discovery-empty-host-rejected', searchText: 'Request' },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /semantic context/
  );
}

async function testHiddenDiscoverySemanticContextRejects(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0, expectationKind: 'discovery' })], {
    targetUrl: 'vscode-webview://logic-apps-hidden-discovery',
    contexts: [{ id: 7, text: 'Add a trigger Operations panel loading', visible: false, frameId: 'semantic-frame' }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'hidden-discovery-context', {
      expectation: { kind: 'discovery', label: 'hidden-discovery-context', searchText: 'Request' },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /semantic context/
  );
}

async function testWrongFrameDiscoverySemanticContextRejects(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })]);
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0, expectationKind: 'discovery' })], {
    targetUrl: 'vscode-webview://logic-apps-wrong-frame-discovery',
    contexts: [{ id: 7, text: 'Add a trigger Operations panel loading', visible: true, frameId: 'unowned-frame' }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'wrong-frame-discovery-context', {
      expectation: { kind: 'discovery', label: 'wrong-frame-discovery-context', searchText: 'Request' },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /semantic context frame/
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
  const screenshotDir = process.env.LA_E2E_CLI_SCREENSHOT_DIR;
  const ownerCdp = new FakeCaptureCdp(
    [
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
    ],
    { ownerFrameRevisionReads: [0, 1, 1, 1] }
  );
  const semanticCdp = new FakeCaptureCdp(
    [
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
      snapshot({ revision: 0, expectationKind: 'monitoringAction', details: { designerCanvas: { visibleNodeCount: 2 } } }),
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
  const metadata = JSON.parse(fs.readFileSync(path.join(screenshotDir ?? '', 'owner-frame-invalidation-retries-capture.json'), 'utf8')) as {
    events?: Array<{ name: string; details?: Record<string, unknown> }>;
  };
  assert.ok(
    metadata.events?.some((event) => event.name === 'rejected'),
    `Expected rejected event. Metadata: ${JSON.stringify(metadata)}`
  );
  assert.ok(
    metadata.events?.some((event) => event.name === 'accepted'),
    `Expected accepted event. Metadata: ${JSON.stringify(metadata)}`
  );
  const rejected = metadata.events?.find((event) => event.name === 'rejected');
  assert.strictEqual(rejected?.details?.ownerRevisionAccepted, false, JSON.stringify(rejected));
  assert.ok('designerCanvas' in (rejected?.details ?? {}), JSON.stringify(rejected));
}

async function testOwnerNotificationInvalidationRetriesCapture(
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
      targetUrl: 'vscode-webview://logic-apps-owner-notification-revision',
      contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true, frameId: 'semantic-root-frame' }],
    }
  );

  await captureCdpScreenshot(ownerCdp, 'owner-notification-invalidation-retries-capture', {
    expectation: {
      kind: 'monitoringAction',
      label: 'owner-notification-invalidation-retries-capture',
      actionTitle: 'Response',
      expectedStatus: 'Succeeded',
    },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });

  assert.strictEqual(ownerCdp.captureAttempts, 2, 'Owner notification mutation during capture should discard the candidate and retry');
  assert.strictEqual(ownerCdp.ownerLatchObservedNotifications, true, 'Owner latch must observe notification containers');
}

async function testResolveNodeTimeoutRetriesForOwnerBinding(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], { resolveNodeTimeoutFailures: 1 });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    mainFrameId: 'semantic-root-frame',
    mainFrameParentId: 'workbench-frame',
    targetUrl: 'vscode-webview://logic-apps-resolve-node-retry',
    contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true, frameId: 'semantic-root-frame' }],
  });

  await captureCdpScreenshot(ownerCdp, 'resolve-node-timeout-retry', {
    expectation: {
      kind: 'monitoringAction',
      label: 'resolve-node-timeout-retry',
      actionTitle: 'Response',
      expectedStatus: 'Succeeded',
    },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });

  assert.ok(ownerCdp.resolveNodeAttempts > 1, 'A typed DOM.resolveNode timeout should retry within the original deadline');
}

async function testResolveNodeNonTimeoutFailsFast(captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    resolveNodeError: new Error('synthetic resolveNode authorization failure'),
  });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    mainFrameId: 'semantic-root-frame',
    mainFrameParentId: 'workbench-frame',
    targetUrl: 'vscode-webview://logic-apps-resolve-node-failfast',
    contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true, frameId: 'semantic-root-frame' }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'resolve-node-non-timeout-failfast', {
      expectation: {
        kind: 'monitoringAction',
        label: 'resolve-node-non-timeout-failfast',
        actionTitle: 'Response',
        expectedStatus: 'Succeeded',
      },
      semanticCdp,
      semanticContextId: 7,
      timeoutMs: 1000,
    }),
    /synthetic resolveNode authorization failure/
  );

  assert.strictEqual(ownerCdp.resolveNodeAttempts, 1, 'Non-timeout DOM.resolveNode errors must not retry');
}

async function testOwnerBindingDeadlineRetainsContext(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot,
  screenshotDir: string
): Promise<void> {
  let now = 100_000;
  const deadline = now + 1000;
  const clock = mock.method(Date, 'now', () => now);
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], { ownerFrameVisibilityResponses: [false] });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-owner-deadline',
    contexts: [{ id: 7, text: 'Response Succeeded', visible: true }],
    onSend: (method) => {
      if (method === 'Page.getFrameTree' && ownerCdp.ownerFrameVisibilityReadIndex > 0) {
        // Expire between RPCs in the second owner lookup, after an actual
        // negative visibility observation. No wall-clock load/sleep is needed
        // to reproduce remaining() throwing inside owner resolution.
        now = deadline;
      }
    },
  });
  const name = 'owner-binding-mid-resolution-deadline';
  try {
    await assert.rejects(
      captureCdpScreenshot(ownerCdp, name, {
        expectation: { kind: 'monitoringAction', label: name, actionTitle: 'Response', expectedStatus: 'Succeeded' },
        semanticCdp,
        semanticContextId: 7,
        timeoutMs: 1000,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.strictEqual(error.message, 'Screenshot binding failed: semantic frame is not owned by the workbench frame tree');
        const cause = (error as Error & { cause?: unknown }).cause;
        assert.ok(cause instanceof Error);
        assert.strictEqual(cause.message, 'Screenshot deadline exceeded');
        return true;
      }
    );
    assert.ok(ownerCdp.ownerFrameVisibilityReadIndex > 0, 'Ownership was observed and rejected before expiry');
    assert.strictEqual(ownerCdp.captureAttempts, 0, 'An owner rejection must never reach Page.captureScreenshot');
    assert.strictEqual(fs.existsSync(path.join(screenshotDir, `${name}.png`)), false);
  } finally {
    clock.mock.restore();
  }
}

async function testOwnerBindingProtocolErrorAtDeadlineRemainsOriginal(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  for (const message of ['synthetic owner authorization failure', 'Screenshot deadline exceeded']) {
    let now = 100_000;
    const deadline = now + 1000;
    const clock = mock.method(Date, 'now', () => now);
    const original = new Error(message);
    const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
      resolveNodeError: original,
      onSend: (method) => {
        if (method === 'DOM.resolveNode') {
          now = deadline;
        }
      },
    });
    const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
      targetUrl: 'vscode-webview://logic-apps-owner-protocol-error',
      contexts: [{ id: 7, text: 'Response Succeeded', visible: true }],
    });
    try {
      await assert.rejects(
        captureCdpScreenshot(ownerCdp, 'owner-protocol-error-at-deadline', {
          expectation: { kind: 'monitoringAction', label: 'owner-protocol-error', actionTitle: 'Response', expectedStatus: 'Succeeded' },
          semanticCdp,
          semanticContextId: 7,
          timeoutMs: 1000,
        }),
        (error: unknown) => error === original
      );
      assert.strictEqual(ownerCdp.resolveNodeAttempts, 1, 'Protocol failures must remain fail-fast even at the deadline');
      assert.strictEqual(ownerCdp.captureAttempts, 0);
    } finally {
      clock.mock.restore();
    }
  }
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

async function testSemanticOwnerNotificationOcclusionRejects(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    ownerFrameIds: ['semantic-frame'],
    ownerFrameOccludedByNotification: true,
  });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-toast-occluded',
    contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'owner-notification-occluded', {
      expectation: {
        kind: 'monitoringAction',
        label: 'owner-notification-occluded',
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

async function testSemanticOwnerTransientNotificationOcclusionWaits(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    ownerFrameIds: ['semantic-frame'],
    ownerFrameVisibilityResponses: [false, false, true],
  });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-transient-toast',
    contexts: [{ id: 7, text: 'Compose Inputs test', visible: true }],
  });

  await captureCdpScreenshot(ownerCdp, 'owner-transient-notification-occlusion', {
    expectation: {
      kind: 'designerCanvas',
      label: 'owner-transient-notification-occlusion',
      requiredNodes: ['Compose'],
    },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });

  assert.ok(ownerCdp.ownerFrameVisibilityReadIndex >= 3);
  assert.strictEqual(ownerCdp.captureAttempts, 1);
}

async function testSemanticOwnerStaleObjectRetries(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    ownerFrameIds: ['semantic-frame'],
    ownerFrameVisibilityResponses: [new Error('Could not find object with given id'), true],
  });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl: 'vscode-webview://logic-apps-replaced-frame',
    contexts: [{ id: 7, text: 'Compose Inputs test', visible: true }],
  });

  await captureCdpScreenshot(ownerCdp, 'owner-stale-object-retry', {
    expectation: {
      kind: 'designerCanvas',
      label: 'owner-stale-object-retry',
      requiredNodes: ['Compose'],
    },
    semanticCdp,
    semanticContextId: 7,
    timeoutMs: 1000,
  });

  assert.ok(ownerCdp.resolveNodeAttempts >= 2);
  assert.strictEqual(ownerCdp.captureAttempts, 1);
}

async function testSemanticOwnerExactIframeNotificationOcclusionRejects(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const targetUrl = 'vscode-webview://logic-apps-exact-toast?id=expected';
  const ownerCdp = new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
    exactIframeTargetUrl: targetUrl,
    exactIframeVisible: true,
    exactIframeOccludedByNotification: true,
    ownerFrameIds: [],
  });
  const semanticCdp = new FakeCaptureCdp([snapshot({ revision: 0 })], {
    targetUrl,
    contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true }],
  });

  await assert.rejects(
    captureCdpScreenshot(ownerCdp, 'owner-exact-iframe-notification-occluded', {
      expectation: {
        kind: 'monitoringAction',
        label: 'owner-exact-iframe-notification-occluded',
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

async function testSerializedOwnerVisibilityOcclusionPredicates(
  captureCdpScreenshot: typeof import('./screenshot').captureCdpScreenshot
): Promise<void> {
  const targetUrl = 'vscode-webview://logic-apps-serialized-visibility?id=expected';
  const rejectedScenarios: OwnerVisibilityScenario[] = [
    { name: 'unrelated-modal-over-center', overlay: 'modal', rect: [100, 100, 1000, 800] },
    { name: 'null-center-hit', nullHit: true },
    { name: 'short-footer-toast-between-samples', overlay: 'toast', rect: [1020, 855, 140, 35] },
  ];

  for (const scenario of rejectedScenarios) {
    await assert.rejects(
      captureCdpScreenshot(
        new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], { ownerVisibilityScenario: scenario }),
        `serialized-owner-visibility-${scenario.name}`,
        {
          expectation: {
            kind: 'monitoringAction',
            label: `serialized-owner-visibility-${scenario.name}`,
            actionTitle: 'Response',
            expectedStatus: 'Succeeded',
          },
          semanticCdp: new FakeCaptureCdp([snapshot({ revision: 0 })], {
            targetUrl,
            contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true }],
          }),
          semanticContextId: 7,
          timeoutMs: 1000,
        }
      ),
      /semantic frame|owner frame/
    );

    await assert.rejects(
      captureCdpScreenshot(
        new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
          exactIframeTargetUrl: targetUrl,
          exactIframeVisibilityScenario: scenario,
          ownerFrameIds: [],
        }),
        `serialized-exact-visibility-${scenario.name}`,
        {
          expectation: {
            kind: 'monitoringAction',
            label: `serialized-exact-visibility-${scenario.name}`,
            actionTitle: 'Response',
            expectedStatus: 'Succeeded',
          },
          semanticCdp: new FakeCaptureCdp([snapshot({ revision: 0 })], {
            targetUrl,
            contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true }],
          }),
          semanticContextId: 7,
          timeoutMs: 1000,
        }
      ),
      /semantic frame|owner frame/
    );
  }

  const outsideNotification: OwnerVisibilityScenario = { name: 'notification-outside-frame', overlay: 'toast', rect: [10, 10, 80, 50] };
  await captureCdpScreenshot(
    new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], { ownerVisibilityScenario: outsideNotification }),
    'serialized-owner-visibility-notification-outside-frame',
    {
      expectation: {
        kind: 'monitoringAction',
        label: 'serialized-owner-visibility-notification-outside-frame',
        actionTitle: 'Response',
        expectedStatus: 'Succeeded',
      },
      semanticCdp: new FakeCaptureCdp([snapshot({ revision: 0 })], {
        targetUrl,
        contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true }],
      }),
      semanticContextId: 7,
      timeoutMs: 1000,
    }
  );
  await captureCdpScreenshot(
    new FakeCaptureCdp([snapshot({ revision: 0 }), snapshot({ revision: 0 })], {
      exactIframeTargetUrl: targetUrl,
      exactIframeVisibilityScenario: outsideNotification,
      ownerFrameIds: [],
    }),
    'serialized-exact-visibility-notification-outside-frame',
    {
      expectation: {
        kind: 'monitoringAction',
        label: 'serialized-exact-visibility-notification-outside-frame',
        actionTitle: 'Response',
        expectedStatus: 'Succeeded',
      },
      semanticCdp: new FakeCaptureCdp([snapshot({ revision: 0 })], {
        targetUrl,
        contexts: [{ id: 7, text: 'Response Succeeded Outputs response payload', visible: true }],
      }),
      semanticContextId: 7,
      timeoutMs: 1000,
    }
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
  ownerLatchObservedNotifications = false;
  resolveNodeAttempts = 0;
  semanticBindingControlMetadataUsed = false;
  latchInstallAttempts = 0;
  latchDisposeAttempts = 0;
  private readinessIndex = 0;
  private ownerFrameRevisionReadIndex = 0;
  private exactIframeRevisionReadIndex = 0;
  ownerFrameVisibilityReadIndex = 0;

  constructor(
    private readonly readinessSnapshots: ScreenshotReadinessSnapshot[],
    private readonly options: {
      captureData?: string;
      failPostSample?: boolean;
      omitCaptureData?: boolean;
      evaluateDelayMs?: number;
      contexts?: Array<{
        id: number;
        text: string;
        controlText?: string;
        visible: boolean;
        frameId?: string;
        requiredSelectorFound?: boolean;
      }>;
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
      exactIframeOccludedByNotification?: boolean;
      failLatchEvaluation?: boolean;
      targetUrl?: string;
      targetTitle?: string;
      failFrameTree?: boolean;
      ownerFrameOccludedByNotification?: boolean;
      ownerFrameVisibilityResponses?: Array<boolean | Error>;
      ownerVisibilityScenario?: OwnerVisibilityScenario;
      exactIframeVisibilityScenario?: OwnerVisibilityScenario;
      resolveNodeTimeoutFailures?: number;
      resolveNodeError?: Error;
      ownerWorkbenchVisible?: boolean;
      onSend?: (method: string) => void;
    } = {}
  ) {
    this.targetUrl = options.targetUrl;
    this.targetTitle = options.targetTitle;
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    this.options.onSend?.(method);
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
      this.resolveNodeAttempts++;
      if (this.options.resolveNodeError) {
        throw this.options.resolveNodeError;
      }
      if (this.options.resolveNodeTimeoutFailures && this.resolveNodeAttempts <= this.options.resolveNodeTimeoutFailures) {
        throw new Error('Timed out waiting for CDP DOM.resolveNode response after 5000ms');
      }
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
          this.ownerLatchObservedNotifications ||= functionDeclaration.includes('.notifications-toasts');
          return { result: { result: { value: { revision: 0 } } } };
        }
        if (functionDeclaration.includes('"dispose"')) {
          return { result: { result: { value: { revision: 0 } } } };
        }
      }
      if (this.options.ownerVisibilityScenario) {
        return {
          result: { result: { value: evaluateSerializedOwnerFrameVisibility(functionDeclaration, this.options.ownerVisibilityScenario) } },
        };
      }
      const ownerFrameVisibilityResponse = this.options.ownerFrameVisibilityResponses
        ? this.options.ownerFrameVisibilityResponses[
            Math.min(this.ownerFrameVisibilityReadIndex++, this.options.ownerFrameVisibilityResponses.length - 1)
          ]
        : undefined;
      if (ownerFrameVisibilityResponse instanceof Error) {
        throw ownerFrameVisibilityResponse;
      }
      return {
        result: {
          result: {
            value: {
              visible: this.options.ownerFrameVisibilityResponses
                ? ownerFrameVisibilityResponse
                : this.options.ownerFrameOccludedByNotification && functionDeclaration.includes('notification-toast')
                  ? false
                  : (this.options.ownerFrameVisible ?? true),
            },
          },
        },
      };
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

  async evaluate<T>(_contextId: number | undefined, expression: string, _options?: { timeoutMs?: number }): Promise<T> {
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
      if (expression.includes('delete globalThis.__logicAppsScreenshotInvalidation')) {
        this.latchDisposeAttempts++;
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
        visibleWorkbench: this.options.ownerWorkbenchVisible ?? true,
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
      if (this.options.exactIframeVisibilityScenario) {
        return evaluateSerializedExactIframeVisibility(expression, this.options.exactIframeVisibilityScenario, targetUrl) as T;
      }
      return {
        count,
        visible:
          count === 1 &&
          this.options.exactIframeVisible === true &&
          !(this.options.exactIframeOccludedByNotification && expression.includes('notification-toast')),
      } as T;
    }
    if (/const expectedText = \[/.test(expression)) {
      const context = this.options.contexts?.find((candidate) => candidate.id === _contextId) ?? this.options.contexts?.[0];
      const expectedTextMatch = expression.match(/const expectedText = (\[[^\n]+]);/);
      const expectedText = expectedTextMatch ? (JSON.parse(expectedTextMatch[1]) as string[]) : [];
      const normalizedContextText = (context?.text ?? '').toLowerCase();
      const normalizedControlText = (context?.controlText ?? '').toLowerCase();
      const requiredSelectorFound = context?.requiredSelectorFound ?? true;
      const normalizedCombinedText = `${normalizedContextText} ${expression.includes('querySelectorAll') ? normalizedControlText : ''}`;
      const bodyMatches = expectedText.every((value) => normalizedContextText.includes(value.toLowerCase()));
      const combinedMatches = expectedText.every((value) => normalizedCombinedText.includes(value.toLowerCase()));
      if (!bodyMatches && combinedMatches) {
        this.semanticBindingControlMetadataUsed = true;
      }
      return {
        ok: !!context?.visible && requiredSelectorFound && combinedMatches,
        visible: !!context?.visible,
        text: context?.text ?? '',
        requiredSelectorFound,
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

interface OwnerVisibilityScenario {
  name: string;
  overlay?: 'toast' | 'modal';
  rect?: [number, number, number, number];
  nullHit?: boolean;
}

function evaluateSerializedOwnerFrameVisibility(functionDeclaration: string, scenario: OwnerVisibilityScenario): { visible: boolean } {
  const { window, frame } = createSerializedOwnerVisibilityFixture(
    scenario,
    'vscode-webview://logic-apps-serialized-visibility?id=expected'
  );
  try {
    return (window.eval(`(${functionDeclaration})`) as { call(thisArg: SerializedDomElement): unknown }).call(frame) as {
      visible: boolean;
    };
  } finally {
    window.close();
  }
}

function evaluateSerializedExactIframeVisibility(
  expression: string,
  scenario: OwnerVisibilityScenario,
  targetUrl: string
): { count: number; visible: boolean } {
  const { window } = createSerializedOwnerVisibilityFixture(scenario, targetUrl);
  try {
    return window.eval(expression) as { count: number; visible: boolean };
  } finally {
    window.close();
  }
}

function createSerializedOwnerVisibilityFixture(
  scenario: OwnerVisibilityScenario,
  targetUrl: string
): { window: SerializedDomWindow; frame: SerializedDomElement } {
  const dom = new JSDOM('<!doctype html><html><body><iframe></iframe></body></html>', { runScripts: 'outside-only' });
  const { window } = dom;
  Object.defineProperties(window, {
    innerWidth: { value: 1200 },
    innerHeight: { value: 1000 },
  });
  const frame = window.document.querySelector('iframe');
  assert.ok(frame instanceof window.HTMLIFrameElement, 'Expected serialized fixture iframe');
  frame.src = targetUrl;
  const frameRect = rectangle([100, 100, 1000, 800]);
  frame.getBoundingClientRect = () => frameRect;
  frame.getClientRects = () => [frameRect];
  Object.defineProperties(frame, {
    offsetWidth: { value: 1000 },
    offsetHeight: { value: 800 },
  });

  let overlay: SerializedDomElement | undefined;
  let overlayRect: SerializedDomRect | undefined;
  if (scenario.overlay) {
    overlay = window.document.createElement('div');
    overlay.className = scenario.overlay === 'toast' ? 'notification-toast' : 'monaco-dialog-modal-block';
    window.document.body.appendChild(overlay);
    overlayRect = rectangle(scenario.rect ?? [0, 0, 0, 0]);
    overlay.getBoundingClientRect = () => overlayRect as SerializedDomRect;
    overlay.getClientRects = () => [overlayRect as SerializedDomRect];
    Object.defineProperties(overlay, {
      offsetWidth: { value: overlayRect.width },
      offsetHeight: { value: overlayRect.height },
    });
  }

  const containsPoint = (rect: SerializedDomRect, x: number, y: number) =>
    x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
  window.document.elementFromPoint = (x: number, y: number) => {
    if (scenario.nullHit) {
      return null;
    }
    if (overlay && overlayRect && containsPoint(overlayRect, x, y)) {
      return overlay;
    }
    return containsPoint(frameRect, x, y) ? frame : window.document.body;
  };

  return { window, frame };
}

interface SerializedDomWindow {
  readonly HTMLIFrameElement: new (...args: unknown[]) => SerializedDomElement;
  readonly document: {
    readonly body: SerializedDomElement;
    querySelector(selector: string): SerializedDomElement | null;
    createElement(tagName: string): SerializedDomElement;
    elementFromPoint(x: number, y: number): SerializedDomElement | null;
  };
  innerWidth: number;
  innerHeight: number;
  eval(expression: string): unknown;
  close(): void;
}

interface SerializedDomElement {
  className: string;
  src: string;
  readonly offsetWidth: number;
  readonly offsetHeight: number;
  appendChild(child: SerializedDomElement): SerializedDomElement;
  contains(child: SerializedDomElement | null): boolean;
  getBoundingClientRect(): SerializedDomRect;
  getClientRects(): SerializedDomRect[];
}

interface SerializedDomRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  x: number;
  y: number;
  toJSON(): Record<string, never>;
}

function rectangle([left, top, width, height]: [number, number, number, number]): SerializedDomRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function snapshot(options: {
  revision: number;
  structuralRevision?: number;
  expectationKind?: ScreenshotReadinessSnapshot['expectationKind'];
  details?: Record<string, unknown>;
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
    details: options.details,
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
