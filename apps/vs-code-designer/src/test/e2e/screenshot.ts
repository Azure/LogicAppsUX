import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { connectToVsCodeWorkbenchCdp } from './cdpClient';
import {
  buildScreenshotMetadata,
  buildScreenshotReadinessExpression,
  disposeScreenshotInvalidationLatchExpression,
  installScreenshotInvalidationLatchExpression,
  isStableScreenshotSample,
  sanitizeScreenshotSegment,
  type ScreenshotCaptureEvent,
  type ScreenshotClassification,
  type ScreenshotExpectation,
  type ScreenshotReadinessMetadata,
  type ScreenshotReadinessSnapshot,
} from './screenshotReadiness';

type SemanticTextGroup = string | string[];

const execFileAsync = promisify(execFile);
export const defaultEvidenceScreenshotTimeoutMs = 15_000;
const screenshotRoot =
  process.env.LA_E2E_CLI_SCREENSHOT_DIR ?? path.resolve(__dirname, '..', '..', '..', '.vscode-test', 'screenshots', 'cli');
const failureAttachmentManifestPath = path.join(screenshotRoot, 'failure-attachments.json');

interface FailureScreenshotAttachment {
  label: string;
  testTitle: string;
  screenshotPath: string;
  createdAt: string;
}

interface ScreenshotFileSystem {
  mkdirSync(path: string, options?: fs.MakeDirectoryOptions): string | undefined;
  rmSync(path: string, options?: fs.RmOptions): void;
  writeFileSync(path: string, data: string | NodeJS.ArrayBufferView): void;
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: BufferEncoding): string;
}

let screenshotFileSystem: ScreenshotFileSystem = fs;
let failureScreenshotHookInstalled = false;

export function setScreenshotFileSystemForTests(fileSystem?: Partial<ScreenshotFileSystem>): () => void {
  const previous = screenshotFileSystem;
  screenshotFileSystem = { ...fs, ...fileSystem };
  return () => {
    screenshotFileSystem = previous;
  };
}

interface CdpClient {
  send(method: string, params?: Record<string, unknown>, options?: { timeoutMs?: number }): Promise<unknown>;
  evaluate<T>(contextId: number | undefined, expression: string, options?: { timeoutMs?: number }): Promise<T>;
  readonly contextGeneration?: number;
  readonly targetId?: string;
  readonly targetUrl?: string;
  readonly targetTitle?: string;
  getExecutionContextIds?(): number[];
  getExecutionContextFrameId?(contextId: number): string | undefined;
}

interface ScreenshotCaptureOptions {
  expectation?: ScreenshotExpectation;
  classification?: ScreenshotClassification;
  semanticCdp?: CdpClient;
  semanticContextId?: number;
  captureBeyondViewport?: boolean;
  timeoutMs?: number;
  deadlineMs?: number;
  optional?: boolean;
  allowWindowsDiagnosticFallback?: boolean;
  binding?: {
    activeTabText?: string[];
    semanticText?: string[];
  };
}

interface OwnerBindingInvalidationLatch {
  readRevision(): Promise<number>;
  dispose(): Promise<void>;
}

export function installFailureScreenshotHook(): void {
  if (failureScreenshotHookInstalled) {
    return;
  }

  teardown(async function (this: { currentTest?: { state?: string; fullTitle?: () => string; title?: string } }) {
    if (this.currentTest?.state !== 'failed') {
      return;
    }

    const testTitle = this.currentTest.fullTitle?.() ?? this.currentTest.title ?? 'unknown test';
    const label = process.env.LA_E2E_CLI_LABEL ?? 'unknown';
    await captureFailureDiagnosticAttachment(label, testTitle);
  });
  failureScreenshotHookInstalled = true;
}

export async function captureCliScreenshot(name: string, options: ScreenshotCaptureOptions = {}): Promise<string | undefined> {
  return captureWorkbenchScreenshot(name, {
    ...options,
    classification: options.classification ?? 'evidence',
  });
}

export async function captureEvidenceScreenshot(
  name: string,
  expectation: ScreenshotExpectation,
  options: Omit<ScreenshotCaptureOptions, 'classification' | 'expectation'> = {}
): Promise<string> {
  const screenshotPath = await captureWorkbenchScreenshot(name, { ...options, classification: 'evidence', expectation });
  if (!screenshotPath) {
    throw new Error(`Evidence screenshot ${name} was not written`);
  }
  return screenshotPath;
}

export async function captureDiagnosticScreenshot(
  name: string,
  options: { reason: string; timeoutMs?: number; allowWindowsDiagnosticFallback?: boolean } = { reason: 'diagnostic' }
): Promise<string | undefined> {
  try {
    return await captureWorkbenchScreenshot(name, {
      classification: 'diagnostic',
      expectation: { kind: 'diagnostic', label: name, reason: options.reason },
      timeoutMs: options.timeoutMs ?? 5000,
      allowWindowsDiagnosticFallback: options.allowWindowsDiagnosticFallback,
    });
  } catch (error) {
    console.warn(`[screenshot] Diagnostic screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

export async function captureFailureDiagnosticAttachment(label: string, testTitle: string): Promise<void> {
  try {
    const screenshotPath = await captureDiagnosticScreenshot(`failure-${label}-${testTitle}-${Date.now()}`, {
      reason: 'test-failure',
      timeoutMs: 5000,
      allowWindowsDiagnosticFallback: true,
    });
    if (!screenshotPath) {
      return;
    }

    appendFailureAttachmentSafely({
      label,
      testTitle,
      screenshotPath: path.resolve(screenshotPath),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn(`[screenshot] Failure diagnostic attachment failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function appendFailureAttachmentSafely(entry: FailureScreenshotAttachment): void {
  try {
    appendFailureAttachment(entry);
  } catch (error) {
    console.warn(`[screenshot] Failure attachment manifest update failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function captureCdpScreenshot(
  cdp: CdpClient,
  name: string,
  options: ScreenshotCaptureOptions = {}
): Promise<string | undefined> {
  const classification = options.classification ?? 'evidence';
  try {
    return await captureCdpScreenshotCore(cdp, name, options, classification);
  } catch (error) {
    if (classification === 'diagnostic') {
      console.warn(`[screenshot] Diagnostic CDP screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
    throw error;
  }
}

async function captureCdpScreenshotCore(
  cdp: CdpClient,
  name: string,
  options: ScreenshotCaptureOptions,
  classification: ScreenshotClassification
): Promise<string | undefined> {
  screenshotFileSystem.mkdirSync(screenshotRoot, { recursive: true });

  const safeName = sanitizeScreenshotSegment(name);
  const screenshotPath = path.join(screenshotRoot, `${safeName}.png`);
  const metadataPath = path.join(screenshotRoot, `${safeName}.json`);
  removeStaleArtifacts(screenshotPath, metadataPath);

  const expectation = options.expectation;
  if (!expectation) {
    if (classification === 'diagnostic') {
      return undefined;
    }
    throw new Error(`Evidence screenshot ${name} must provide an explicit expectation`);
  }
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? (classification === 'diagnostic' ? 5000 : defaultEvidenceScreenshotTimeoutMs);
  const deadline = options.deadlineMs ?? startedAt + timeoutMs;
  const samples: ScreenshotReadinessSnapshot[] = [];
  const events: ScreenshotCaptureEvent[] = [];
  let captureAttempts = 0;
  const targetId = cdp.targetId ?? 'unknown-workbench-target';
  let frameId = 'main-frame';
  let generation = cdp.contextGeneration ?? 0;

  await cdp.send('Page.enable', undefined, { timeoutMs: remaining(deadline, 2000) }).catch(() => undefined);
  await cdp.send('Runtime.enable', undefined, { timeoutMs: remaining(deadline, 2000) }).catch(() => undefined);
  const frameTree = await cdp.send('Page.getFrameTree', undefined, { timeoutMs: remaining(deadline, 2000) }).catch(() => undefined);
  frameId = getMainFrameId(frameTree) ?? frameId;

  const sampleCdp = options.semanticCdp ?? cdp;
  let sampleContextId = options.semanticContextId;
  let latchedContextId: number | undefined;
  let ownerBindingLatch: OwnerBindingInvalidationLatch | undefined;
  const ensureSemanticLatchInstalled = async (): Promise<void> => {
    if (classification === 'diagnostic' || expectation.kind === 'diagnostic') {
      return;
    }
    if (latchedContextId === sampleContextId) {
      return;
    }
    if (latchedContextId !== undefined) {
      await sampleCdp
        .evaluate(latchedContextId, disposeScreenshotInvalidationLatchExpression, { timeoutMs: remaining(deadline, 1000) })
        .catch(() => undefined);
    }
    await sampleCdp.evaluate(sampleContextId, installScreenshotInvalidationLatchExpression, { timeoutMs: remaining(deadline, 2000) });
    latchedContextId = sampleContextId;
  };
  if (classification !== 'diagnostic' && expectation.kind !== 'diagnostic') {
    sampleContextId = await assertBoundSemanticContext(cdp, sampleCdp, sampleContextId, expectation, options.binding, deadline);
    await ensureSemanticLatchInstalled();
    ownerBindingLatch = await installOwnerBindingInvalidationLatch(cdp, sampleCdp, deadline);
  }
  const metadataFrameId = getSemanticMetadataFrameId(sampleCdp, sampleContextId) ?? frameId;
  let data: string | undefined;
  const recordEvent = (name: string, sample?: ScreenshotReadinessSnapshot, values: Partial<ScreenshotCaptureEvent> = {}): void => {
    events.push({
      name,
      elapsedMs: Date.now() - startedAt,
      attempt: captureAttempts || undefined,
      generation: sample?.generation ?? values.generation,
      revision: sample?.revision ?? values.revision,
      structuralRevision: sample?.structuralRevision ?? values.structuralRevision,
      ownerRevision: values.ownerRevision,
      reasonCodes: [...(sample?.reasonCodes ?? []), ...(values.reasonCodes ?? [])],
      blockers: sample?.blockers ?? values.blockers,
      counts: sample?.counts ?? values.counts,
      anchors: sample?.anchors ?? values.anchors,
      details: { ...(sample?.details ?? {}), ...(values.details ?? {}) },
    });
  };
  try {
    while (Date.now() < deadline && !data) {
      let stableSample: ScreenshotReadinessSnapshot | undefined;
      if (classification === 'diagnostic' || expectation.kind === 'diagnostic') {
        stableSample = await sampleReadiness(sampleCdp, sampleContextId, expectation, generation, 0, deadline).catch(() => undefined);
        if (stableSample) {
          samples.push(stableSample);
          generation = stableSample.generation;
          recordEvent('diagnostic-sample', stableSample);
        }
      } else {
        recordEvent('readiness-wait-start', undefined, { generation });
        sampleContextId = await assertBoundSemanticContext(cdp, sampleCdp, sampleContextId, expectation, options.binding, deadline);
        await ensureSemanticLatchInstalled();
        stableSample = await waitForStableReadiness(sampleCdp, sampleContextId, expectation, generation, deadline, samples);
        generation = stableSample?.generation ?? generation;
        recordEvent(stableSample?.ready ? 'stable-readiness' : 'readiness-unavailable', stableSample ?? samples.at(-1));
      }

      if (classification !== 'diagnostic' && (!stableSample || !stableSample.ready)) {
        break;
      }

      const preCaptureGeneration = sampleCdp.contextGeneration ?? generation;
      const preCaptureRevision = stableSample?.revision ?? -1;
      const preCaptureStructuralRevision = stableSample?.structuralRevision ?? preCaptureRevision;
      const preOwnerRevision = await ownerBindingLatch?.readRevision();
      if (classification !== 'diagnostic' && expectation.kind !== 'diagnostic') {
        sampleContextId = await assertBoundSemanticContext(cdp, sampleCdp, sampleContextId, expectation, options.binding, deadline);
        await ensureSemanticLatchInstalled();
      }
      captureAttempts++;
      recordEvent('capture-start', stableSample, { ownerRevision: preOwnerRevision });
      let response: { result?: { data?: string } };
      try {
        response = (await cdp.send(
          'Page.captureScreenshot',
          {
            format: 'png',
            captureBeyondViewport: options.captureBeyondViewport ?? false,
          },
          { timeoutMs: remaining(deadline, 5000) }
        )) as {
          result?: { data?: string };
        };
      } catch (error) {
        recordEvent('capture-rpc-failed', stableSample, {
          ownerRevision: preOwnerRevision,
          reasonCodes: ['capture-rpc-failed'],
        });
        if (classification === 'diagnostic') {
          break;
        }
        samples.push({
          ready: false,
          reasonCodes: ['capture-rpc-failed'],
          blockers: [],
          anchors: [],
          viewport: stableSample?.viewport ?? { width: 0, height: 0, deviceScaleFactor: 1 },
          counts: stableSample?.counts ?? {},
          generation,
          revision: preCaptureRevision + 1,
          scrollY: stableSample?.scrollY ?? 0,
          expectationKind: expectation.kind,
        });
        await delay(Math.min(250, Math.max(0, deadline - Date.now())));
        continue;
      }

      const candidateData = response.result?.data;
      recordEvent('capture-end', stableSample, { ownerRevision: preOwnerRevision });
      if (!candidateData) {
        if (classification === 'diagnostic') {
          break;
        }
        throw new Error(`CDP screenshot returned no data for ${name}`);
      }

      let postSample: ScreenshotReadinessSnapshot;
      try {
        if (classification !== 'diagnostic' && expectation.kind !== 'diagnostic') {
          sampleContextId = await assertBoundSemanticContext(cdp, sampleCdp, sampleContextId, expectation, options.binding, deadline);
          await ensureSemanticLatchInstalled();
        }
        postSample = await sampleReadiness(sampleCdp, sampleContextId, expectation, sampleCdp.contextGeneration ?? generation, 0, deadline);
        recordEvent('post-sample', postSample);
      } catch (error) {
        recordEvent('postcheck-failed', stableSample, { reasonCodes: ['postcheck-failed'] });
        if (classification === 'diagnostic') {
          data = candidateData;
          break;
        }
        samples.push({
          ready: false,
          reasonCodes: ['postcheck-failed'],
          blockers: [],
          anchors: [],
          viewport: { width: 0, height: 0, deviceScaleFactor: 1 },
          counts: {},
          generation,
          revision: preCaptureRevision + 1,
          scrollY: 0,
          expectationKind: expectation.kind,
        });
        await delay(Math.min(250, Math.max(0, deadline - Date.now())));
        continue;
      }

      samples.push(postSample);
      generation = postSample.generation;
      const postCaptureGeneration = sampleCdp.contextGeneration ?? generation;
      const postOwnerRevision = await ownerBindingLatch?.readRevision();
      const postCaptureStructuralRevision = postSample.structuralRevision ?? postSample.revision;
      const revisionAccepted =
        expectation.kind === 'workbenchShell'
          ? postCaptureStructuralRevision === preCaptureStructuralRevision
          : postSample.revision === preCaptureRevision;
      const ownerRevisionAccepted = preOwnerRevision === undefined || preOwnerRevision === postOwnerRevision;
      const accepted =
        classification === 'diagnostic' ||
        (preCaptureGeneration === postCaptureGeneration &&
          ownerRevisionAccepted &&
          postSample.ready &&
          revisionAccepted &&
          stableSample &&
          isStableScreenshotSample(stableSample, postSample));
      if (accepted) {
        recordEvent('accepted', postSample, { ownerRevision: postOwnerRevision });
        data = candidateData;
      } else {
        recordEvent('rejected', postSample, {
          ownerRevision: postOwnerRevision,
          details: {
            preCaptureGeneration,
            postCaptureGeneration,
            preCaptureRevision,
            postCaptureRevision: postSample.revision,
            preCaptureStructuralRevision,
            postCaptureStructuralRevision,
            preOwnerRevision,
            postOwnerRevision,
            ownerRevisionAccepted,
            revisionAccepted,
          },
        });
        if (!ownerRevisionAccepted) {
          await ownerBindingLatch?.dispose().catch(() => undefined);
          ownerBindingLatch = await installOwnerBindingInvalidationLatch(cdp, sampleCdp, deadline);
        }
        await delay(Math.min(250, Math.max(0, deadline - Date.now())));
      }
    }
  } finally {
    if (classification !== 'diagnostic' && expectation.kind !== 'diagnostic') {
      if (latchedContextId !== undefined) {
        await sampleCdp
          .evaluate(latchedContextId, disposeScreenshotInvalidationLatchExpression, { timeoutMs: 1000 })
          .catch(() => undefined);
      }
      await ownerBindingLatch?.dispose().catch(() => undefined);
    }
  }

  if (!data) {
    const reasonCodes = [
      classification === 'diagnostic' ? 'diagnostic-capture-unavailable' : 'readiness-timeout',
      ...(samples.at(-1)?.reasonCodes ?? []),
    ];
    writeScreenshotMetadata(
      metadataPath,
      buildScreenshotMetadata({
        checkpoint: safeName,
        phase: expectation.kind,
        classification,
        verdict: 'failed',
        targetId,
        frameId: metadataFrameId,
        generation,
        timeoutMs,
        elapsedMs: Date.now() - startedAt,
        samples,
        captureAttempts,
        reasonCodes,
        events,
      })
    );
    if (classification === 'diagnostic') {
      return undefined;
    }
    throw new Error(`Screenshot readiness failed for ${name}: ${reasonCodes.join(', ')}`);
  }

  screenshotFileSystem.writeFileSync(screenshotPath, Buffer.from(data, 'base64'));
  writeScreenshotMetadata(
    metadataPath,
    buildScreenshotMetadata({
      checkpoint: safeName,
      phase: expectation.kind,
      classification,
      verdict: classification === 'diagnostic' ? 'diagnostic' : 'accepted',
      targetId,
      frameId: metadataFrameId,
      generation,
      timeoutMs,
      elapsedMs: Date.now() - startedAt,
      samples,
      captureAttempts,
      reasonCodes: samples.at(-1)?.reasonCodes,
      events,
    })
  );
  console.log(`[screenshot] Saved: ${screenshotPath}`);
  return screenshotPath;
}

async function captureWorkbenchScreenshot(name: string, options: ScreenshotCaptureOptions): Promise<string | undefined> {
  screenshotFileSystem.mkdirSync(screenshotRoot, { recursive: true });

  const safeName = sanitizeScreenshotSegment(name);
  const screenshotPath = path.join(screenshotRoot, `${safeName}.png`);
  const metadataPath = path.join(screenshotRoot, `${safeName}.json`);
  removeStaleArtifacts(screenshotPath, metadataPath);

  if (options.optional && process.env.LA_E2E_CLI_CAPTURE_FIELD_VALIDATION_SCREENSHOTS === '0') {
    writeScreenshotMetadata(
      metadataPath,
      disabledMetadata(safeName, options.classification ?? 'diagnostic', options.expectation?.kind ?? 'disabled')
    );
    console.log(`[screenshot] Capture disabled: ${metadataPath}`);
    return undefined;
  }

  const timeoutMs = options.timeoutMs ?? (options.classification === 'diagnostic' ? 5000 : 15000);
  const deadline = Date.now() + timeoutMs;
  try {
    const cdp = await connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs: remaining(deadline, Math.min(timeoutMs, 15000)) });
    try {
      return await captureCdpScreenshot(cdp, name, { ...options, timeoutMs, deadlineMs: deadline });
    } finally {
      cdp.dispose();
    }
  } catch (error) {
    if (options.classification !== 'diagnostic') {
      throw error;
    }
    console.warn(`[screenshot] CDP screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (options.classification === 'diagnostic' && options.allowWindowsDiagnosticFallback && process.platform === 'win32') {
    try {
      await captureWindowsScreenshot(screenshotPath);
      writeScreenshotMetadata(
        metadataPath,
        buildScreenshotMetadata({
          checkpoint: safeName,
          phase: options.expectation?.kind ?? 'diagnostic',
          classification: 'diagnostic',
          verdict: 'diagnostic',
          targetId: 'windows-desktop-diagnostic',
          frameId: 'windows-desktop-diagnostic',
          generation: 0,
          timeoutMs: options.timeoutMs ?? 0,
          elapsedMs: 0,
          samples: [],
          captureAttempts: 1,
          reasonCodes: ['windows-desktop-diagnostic-fallback'],
        })
      );
      console.log(`[screenshot] Saved: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.warn(`[screenshot] Windows screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return undefined;
}

async function assertBoundSemanticContext(
  ownerCdp: CdpClient,
  semanticCdp: CdpClient,
  contextId: number | undefined,
  expectation: ScreenshotExpectation,
  binding: ScreenshotCaptureOptions['binding'] | undefined,
  deadline: number
): Promise<number | undefined> {
  if (!contextId && semanticCdp === ownerCdp) {
    await assertOwnerWorkbenchBinding(ownerCdp, undefined, binding, deadline);
    return contextId;
  }

  const expectedText = [...deriveSemanticText(expectation), ...(binding?.semanticText ?? [])].filter((value) =>
    Array.isArray(value) ? value.length > 0 : value.length > 0
  );
  if (expectedText.length === 0 && !contextId) {
    await assertOwnerWorkbenchBinding(ownerCdp, undefined, binding, deadline);
    return contextId;
  }

  const expectedFrameId = contextId !== undefined ? semanticCdp.getExecutionContextFrameId?.(contextId) : undefined;
  const requiredSelector = deriveSemanticRequiredSelector(expectation);
  const result = await getSemanticContextBinding(semanticCdp, contextId, expectedText, deadline, requiredSelector).catch(() => undefined);
  if (result?.ok) {
    await assertSemanticContextFrameBelongsToTarget(semanticCdp, contextId, deadline);
    await assertOwnerWorkbenchBinding(ownerCdp, semanticCdp, binding, deadline);
    return contextId;
  }
  if (result?.visible && result.requiredSelectorFound && canWaitForSemanticReadiness(expectation)) {
    await assertSemanticContextFrameBelongsToTarget(semanticCdp, contextId, deadline);
    await assertOwnerWorkbenchBinding(ownerCdp, semanticCdp, binding, deadline);
    return contextId;
  }

  const reacquiredContextId = await reacquireSemanticContext(semanticCdp, expectedText, deadline, expectedFrameId, requiredSelector);
  await assertSemanticContextFrameBelongsToTarget(semanticCdp, reacquiredContextId, deadline);
  await assertOwnerWorkbenchBinding(ownerCdp, semanticCdp, binding, deadline);
  return reacquiredContextId;
}

async function assertOwnerWorkbenchBinding(
  ownerCdp: CdpClient,
  semanticCdp: CdpClient | undefined,
  binding: ScreenshotCaptureOptions['binding'] | undefined,
  deadline: number
): Promise<void> {
  if (semanticCdp && semanticCdp !== ownerCdp) {
    await assertSemanticTargetOwnedByVisibleWorkbenchFrame(ownerCdp, semanticCdp, deadline);
  }

  const state = await ownerCdp.evaluate<{
    activeTabText: string;
    activeTabVisible: boolean;
    visibleWorkbench: boolean;
  }>(
    undefined,
    `(() => {
      const isVisible = (element) => {
        if (!element || !(element.offsetWidth || element.offsetHeight || element.getClientRects().length)) {
          return false;
        }
        let current = element;
        while (current instanceof HTMLElement) {
          if (current.hidden || current.getAttribute('aria-hidden') === 'true') {
            return false;
          }
          const style = getComputedStyle(current);
          if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number.parseFloat(style.opacity || '1') === 0) {
            return false;
          }
          current = current.parentElement;
        }
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      };
      const activeTab = Array.from(document.querySelectorAll([
          '.editor-group-container .tabs-container [role="tab"][aria-selected="true"]',
          '.editor-group-container .tabs-container .tab.active',
          '.editor-group-container .tabs-container .tab.selected',
          '.editor-group-container [role="tab"][aria-selected="true"]',
          '.tabs-container [role="tab"][aria-selected="true"]',
          '.tabs-container .tab.active',
          '.tabs-container .tab.selected',
        ].join(', ')))
        .filter(isVisible)
        .at(-1);
      return {
        activeTabText: (activeTab?.textContent || '').replace(/\\s+/g, ' ').trim(),
        activeTabVisible: !!activeTab,
        visibleWorkbench: !!document.querySelector('.monaco-workbench'),
      };
    })()`,
    { timeoutMs: remaining(deadline, 2000) }
  );

  if (!state.visibleWorkbench) {
    throw new Error('Screenshot binding failed: owner workbench is not visible');
  }

  if (
    binding?.activeTabText?.length &&
    (!state.activeTabVisible || !binding.activeTabText.every((value) => normalizedIncludes(state.activeTabText, value)))
  ) {
    throw new Error(`Screenshot binding failed: active tab does not include ${binding.activeTabText.join(', ')}`);
  }
}

async function assertSemanticTargetOwnedByVisibleWorkbenchFrame(
  ownerCdp: CdpClient,
  semanticCdp: CdpClient,
  deadline: number
): Promise<void> {
  while (Date.now() < deadline) {
    let ownerObjectId: string | undefined;
    try {
      ownerObjectId = await resolveSemanticFrameOwnerObjectId(ownerCdp, semanticCdp, deadline);
      if (ownerObjectId && (await isResolvedOwnerFrameVisible(ownerCdp, ownerObjectId, deadline))) {
        return;
      }
    } catch (error) {
      if (!isTransientOwnerFrameError(error)) {
        throw error;
      }
    }
    if (Date.now() >= deadline) {
      break;
    }
    if (await hasExactVisibleWorkbenchIframeForSemanticTarget(ownerCdp, semanticCdp.targetUrl, deadline)) {
      return;
    }
    if (Date.now() >= deadline) {
      break;
    }
    await delay(Math.min(100, Math.max(deadline - Date.now(), 0)));
  }

  throw new Error('Screenshot binding failed: semantic frame is not owned by the workbench frame tree');
}

function isTransientOwnerFrameError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === 'Inspected target navigated or closed' ||
      error.message === 'Cannot find context with specified id' ||
      /^Execution context was destroyed(?:[.,].*)?$/.test(error.message) ||
      /(?:Could not find|Cannot find|No) (?:DOM )?(?:node|object) with (?:given )?id/i.test(error.message) ||
      /Node with given id does not belong to the document/i.test(error.message))
  );
}

async function installOwnerBindingInvalidationLatch(
  ownerCdp: CdpClient,
  semanticCdp: CdpClient,
  deadline: number
): Promise<OwnerBindingInvalidationLatch | undefined> {
  if (semanticCdp === ownerCdp) {
    return undefined;
  }

  const objectId = await resolveSemanticFrameOwnerObjectId(ownerCdp, semanticCdp, deadline);
  if (objectId) {
    await ownerCdp.send(
      'Runtime.callFunctionOn',
      {
        objectId,
        returnByValue: true,
        functionDeclaration: ownerFrameInvalidationFunction('install'),
      },
      { timeoutMs: remaining(deadline, 2000) }
    );
    return {
      readRevision: async () => {
        const result = (await ownerCdp.send(
          'Runtime.callFunctionOn',
          { objectId, returnByValue: true, functionDeclaration: ownerFrameInvalidationFunction('read') },
          { timeoutMs: remaining(deadline, 1000) }
        )) as { result?: { result?: { value?: { revision?: number } } } };
        return result.result?.result?.value?.revision ?? 0;
      },
      dispose: async () => {
        await ownerCdp.send(
          'Runtime.callFunctionOn',
          { objectId, returnByValue: true, functionDeclaration: ownerFrameInvalidationFunction('dispose') },
          { timeoutMs: remaining(deadline, 1000) }
        );
      },
    };
  }

  const semanticTargetUrl = semanticCdp.targetUrl;
  if (semanticTargetUrl && (await installExactIframeInvalidationLatch(ownerCdp, semanticTargetUrl, deadline))) {
    return {
      readRevision: async () => {
        const result = await readExactIframeInvalidationLatch(ownerCdp, semanticTargetUrl, deadline);
        return result.revision;
      },
      dispose: async () => {
        await disposeExactIframeInvalidationLatch(ownerCdp, semanticTargetUrl, deadline);
      },
    };
  }

  throw new Error('Screenshot binding failed: unable to install owner frame invalidation latch');
}

async function resolveSemanticFrameOwnerObjectId(
  ownerCdp: CdpClient,
  semanticCdp: CdpClient,
  deadline: number
): Promise<string | undefined> {
  const semanticFrameTree = await semanticCdp.send('Page.getFrameTree', undefined, { timeoutMs: remaining(deadline, 2000) });
  const semanticMainFrame = getMainFrameInfo(semanticFrameTree);
  const ownerFrameTree = await ownerCdp.send('Page.getFrameTree', undefined, { timeoutMs: remaining(deadline, 2000) });
  const ownerMainFrameId = getMainFrameId(ownerFrameTree);
  const ownerFrameIds = getFrameIds(ownerFrameTree);
  const ownerFrameId = ownerFrameIds.includes(semanticMainFrame.id ?? '')
    ? semanticMainFrame.id
    : semanticMainFrame.parentId === ownerMainFrameId
      ? semanticMainFrame.id
      : await getSemanticOwnerFrameIdFromTargetInfo(semanticCdp, ownerFrameIds, deadline);
  if (!ownerFrameId) {
    return undefined;
  }

  const ownerNode = (await ownerCdp.send('DOM.getFrameOwner', { frameId: ownerFrameId }, { timeoutMs: remaining(deadline, 2000) })) as {
    result?: { backendNodeId?: number; nodeId?: number };
  };
  const backendNodeId = ownerNode.result?.backendNodeId;
  const nodeId = ownerNode.result?.nodeId;
  if (!backendNodeId && !nodeId) {
    throw new Error('Screenshot binding failed: unable to resolve semantic frame owner');
  }

  const resolved = (await sendWithTransientRetry(
    ownerCdp,
    'DOM.resolveNode',
    { ...(backendNodeId ? { backendNodeId } : { nodeId }) },
    deadline,
    5000
  )) as { result?: { object?: { objectId?: string } } };
  const objectId = resolved.result?.object?.objectId;
  if (!objectId) {
    throw new Error('Screenshot binding failed: unable to resolve semantic frame owner object');
  }
  return objectId;
}

async function sendWithTransientRetry(
  cdp: CdpClient,
  method: string,
  params: Record<string, unknown>,
  deadline: number,
  perAttemptTimeoutMs: number
): Promise<unknown> {
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      return await cdp.send(method, params, { timeoutMs: remaining(deadline, perAttemptTimeoutMs) });
    } catch (error) {
      lastError = error;
      if (!isTransientCdpTimeout(error)) {
        throw error;
      }
      await delay(Math.min(250, Math.max(0, deadline - Date.now())));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Timed out waiting for transient CDP ${method} retry`);
}

function isTransientCdpTimeout(error: unknown): boolean {
  return error instanceof Error && /Timed out waiting for CDP .* response after \d+ms/.test(error.message);
}

async function isResolvedOwnerFrameVisible(ownerCdp: CdpClient, objectId: string, deadline: number): Promise<boolean> {
  const visibility = (await ownerCdp.send(
    'Runtime.callFunctionOn',
    {
      objectId,
      returnByValue: true,
      functionDeclaration: `function () {
        const frame = this;
        const isVisible = (element) => {
          if (!(element instanceof HTMLElement) || !(element.offsetWidth || element.offsetHeight || element.getClientRects().length)) {
            return false;
          }
          let current = element;
          while (current instanceof HTMLElement) {
            if (current.hidden || current.getAttribute('aria-hidden') === 'true') {
              return false;
            }
            const style = getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number.parseFloat(style.opacity || '1') === 0) {
              return false;
            }
            current = current.parentElement;
          }
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.right <= 0 || rect.top >= window.innerHeight || rect.left >= window.innerWidth) {
            return false;
          }
          const visibleRect = {
            left: Math.max(rect.left, 0),
            top: Math.max(rect.top, 0),
            right: Math.min(rect.right, window.innerWidth),
            bottom: Math.min(rect.bottom, window.innerHeight),
          };
          if (visibleRect.right <= visibleRect.left || visibleRect.bottom <= visibleRect.top) {
            return false;
          }
          const intersects = (first, second) =>
            first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
          const visibleNotifications = Array.from(document.querySelectorAll('.notification-toast, .notification-list-item')).filter((candidate) => {
            if (!(candidate instanceof HTMLElement) || !(candidate.offsetWidth || candidate.offsetHeight || candidate.getClientRects().length)) {
              return false;
            }
            const style = getComputedStyle(candidate);
            if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity || '1') === 0) {
              return false;
            }
            const notificationRect = candidate.getBoundingClientRect();
            return notificationRect.width > 0 && notificationRect.height > 0;
          });
          if (
            visibleNotifications.some((notification) => {
              const notificationRect = notification.getBoundingClientRect();
              return intersects(visibleRect, notificationRect);
            })
          ) {
            return false;
          }
          const x = Math.min(Math.max((visibleRect.left + visibleRect.right) / 2, 0), Math.max(window.innerWidth - 1, 0));
          const y = Math.min(Math.max((visibleRect.top + visibleRect.bottom) / 2, 0), Math.max(window.innerHeight - 1, 0));
          const topElement = document.elementFromPoint(x, y);
          return topElement === frame || frame.contains(topElement);
        };
        return { visible: isVisible(frame) };
      }`,
    },
    { timeoutMs: remaining(deadline, 2000) }
  )) as { result?: { result?: { value?: { visible?: boolean } } } };
  return visibility.result?.result?.value?.visible === true;
}

function ownerFrameInvalidationFunction(action: 'install' | 'read' | 'dispose'): string {
  return `function () {
    const key = '__logicAppsOwnerFrameInvalidation';
    if (${JSON.stringify(action)} === 'dispose') {
      const state = this[key];
      state?.observer?.disconnect?.();
      state?.ancestorObserver?.disconnect?.();
      delete this[key];
      return { revision: state?.revision || 0 };
    }
    if (${JSON.stringify(action)} === 'read') {
      return { revision: this[key]?.revision || 0 };
    }
    const frame = this;
    const existing = frame[key];
    existing?.observer?.disconnect?.();
    existing?.ancestorObserver?.disconnect?.();
    const state = {
      revision: 0,
      observed: [],
      bump() {
        this.revision += 1;
      },
    };
    const observerOptions = { attributes: true, childList: true, subtree: true, attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'] };
    state.observer = new MutationObserver(() => state.bump());
    const observe = (element, options = observerOptions) => {
      if (element && !state.observed.includes(element)) {
        state.observed.push(element);
        state.observer.observe(element, options);
      }
    };
    observe(frame);
    observe(document.querySelector('.editor-group-container'), observerOptions);
    observe(document.querySelector('.tabs-container'), observerOptions);
    observe(document.querySelector('.notifications-toasts'), observerOptions);
    observe(document.querySelector('.notifications-center'), observerOptions);
    state.ancestorObserver = new MutationObserver(() => state.bump());
    let ancestor = frame.parentElement;
    while (ancestor) {
      state.ancestorObserver.observe(ancestor, { attributes: true, childList: true, attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'] });
      ancestor = ancestor.parentElement;
    }
    frame[key] = state;
    return { revision: state.revision };
  }`;
}

async function installExactIframeInvalidationLatch(ownerCdp: CdpClient, semanticTargetUrl: string, deadline: number): Promise<boolean> {
  const result = await ownerCdp.evaluate<{ installed: boolean }>(
    undefined,
    exactIframeInvalidationExpression(semanticTargetUrl, 'install'),
    { timeoutMs: remaining(deadline, 2000) }
  );
  return result.installed;
}

async function readExactIframeInvalidationLatch(
  ownerCdp: CdpClient,
  semanticTargetUrl: string,
  deadline: number
): Promise<{ revision: number }> {
  return ownerCdp.evaluate<{ revision: number }>(undefined, exactIframeInvalidationExpression(semanticTargetUrl, 'read'), {
    timeoutMs: remaining(deadline, 1000),
  });
}

async function disposeExactIframeInvalidationLatch(ownerCdp: CdpClient, semanticTargetUrl: string, deadline: number): Promise<void> {
  await ownerCdp
    .evaluate(undefined, exactIframeInvalidationExpression(semanticTargetUrl, 'dispose'), { timeoutMs: remaining(deadline, 1000) })
    .catch(() => undefined);
}

function exactIframeInvalidationExpression(semanticTargetUrl: string, action: 'install' | 'read' | 'dispose'): string {
  return `(() => {
    const targetUrl = ${JSON.stringify(semanticTargetUrl)};
    const key = '__logicAppsOwnerFrameInvalidation';
    const frame = Array.from(document.querySelectorAll('iframe')).find((candidate) => candidate.src === targetUrl);
    if (!frame) {
      return { installed: false, revision: 0 };
    }
    if (${JSON.stringify(action)} === 'dispose') {
      const state = frame[key];
      state?.observer?.disconnect?.();
      state?.ancestorObserver?.disconnect?.();
      delete frame[key];
      return { installed: true, revision: state?.revision || 0 };
    }
    if (${JSON.stringify(action)} === 'read') {
      return { installed: true, revision: frame[key]?.revision || 0 };
    }
    const existing = frame[key];
    existing?.observer?.disconnect?.();
    existing?.ancestorObserver?.disconnect?.();
    const state = {
      revision: 0,
      observed: [],
      bump() {
        this.revision += 1;
      },
    };
    const observerOptions = { attributes: true, childList: true, subtree: true, attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'] };
    state.observer = new MutationObserver(() => state.bump());
    const observe = (element, options = observerOptions) => {
      if (element && !state.observed.includes(element)) {
        state.observed.push(element);
        state.observer.observe(element, options);
      }
    };
    observe(frame);
    observe(document.querySelector('.editor-group-container'), observerOptions);
    observe(document.querySelector('.tabs-container'), observerOptions);
    observe(document.querySelector('.notifications-toasts'), observerOptions);
    observe(document.querySelector('.notifications-center'), observerOptions);
    state.ancestorObserver = new MutationObserver(() => state.bump());
    let ancestor = frame.parentElement;
    while (ancestor) {
      state.ancestorObserver.observe(ancestor, { attributes: true, childList: true, attributeFilter: ['aria-hidden', 'class', 'hidden', 'style'] });
      ancestor = ancestor.parentElement;
    }
    frame[key] = state;
    return { installed: true, revision: state.revision };
  })()`;
}

async function assertSemanticContextFrameBelongsToTarget(
  semanticCdp: CdpClient,
  contextId: number | undefined,
  deadline: number
): Promise<void> {
  if (contextId === undefined || !semanticCdp.getExecutionContextFrameId) {
    return;
  }

  const contextFrameId = semanticCdp.getExecutionContextFrameId(contextId);
  if (!contextFrameId) {
    throw new Error('Screenshot binding failed: semantic context has no frame identity');
  }

  const semanticFrameIds = getFrameIds(await semanticCdp.send('Page.getFrameTree', undefined, { timeoutMs: remaining(deadline, 2000) }));
  if (!semanticFrameIds.includes(contextFrameId)) {
    throw new Error('Screenshot binding failed: semantic context frame is outside semantic target');
  }
}

async function getSemanticOwnerFrameIdFromTargetInfo(
  semanticCdp: CdpClient,
  ownerFrameIds: string[],
  deadline: number
): Promise<string | undefined> {
  const targetInfo = (await semanticCdp
    .send('Target.getTargetInfo', undefined, { timeoutMs: remaining(deadline, 2000) })
    .catch(() => undefined)) as { result?: { targetInfo?: { openerFrameId?: string } } } | undefined;
  const openerFrameId = targetInfo?.result?.targetInfo?.openerFrameId;
  return openerFrameId && ownerFrameIds.includes(openerFrameId) ? openerFrameId : undefined;
}

async function hasExactVisibleWorkbenchIframeForSemanticTarget(
  ownerCdp: CdpClient,
  semanticTargetUrl: string | undefined,
  deadline: number
): Promise<boolean> {
  if (!semanticTargetUrl) {
    return false;
  }

  const result = await ownerCdp
    .evaluate<{ count: number; visible: boolean }>(
      undefined,
      `(() => {
        const targetUrl = ${JSON.stringify(semanticTargetUrl)};
        const isVisible = (element) => {
          if (!(element instanceof HTMLIFrameElement) || !(element.offsetWidth || element.offsetHeight || element.getClientRects().length)) {
            return false;
          }
          let current = element;
          while (current instanceof HTMLElement) {
            if (current.hidden || current.getAttribute('aria-hidden') === 'true') {
              return false;
            }
            const style = getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number.parseFloat(style.opacity || '1') === 0) {
              return false;
            }
            current = current.parentElement;
          }
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.right <= 0 || rect.top >= window.innerHeight || rect.left >= window.innerWidth) {
            return false;
          }
          const visibleRect = {
            left: Math.max(rect.left, 0),
            top: Math.max(rect.top, 0),
            right: Math.min(rect.right, window.innerWidth),
            bottom: Math.min(rect.bottom, window.innerHeight),
          };
          if (visibleRect.right <= visibleRect.left || visibleRect.bottom <= visibleRect.top) {
            return false;
          }
          const intersects = (first, second) =>
            first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
          const visibleNotifications = Array.from(document.querySelectorAll('.notification-toast, .notification-list-item')).filter((candidate) => {
            if (!(candidate instanceof HTMLElement) || !(candidate.offsetWidth || candidate.offsetHeight || candidate.getClientRects().length)) {
              return false;
            }
            const style = getComputedStyle(candidate);
            if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity || '1') === 0) {
              return false;
            }
            const notificationRect = candidate.getBoundingClientRect();
            return notificationRect.width > 0 && notificationRect.height > 0;
          });
          if (
            visibleNotifications.some((notification) => {
              const notificationRect = notification.getBoundingClientRect();
              return intersects(visibleRect, notificationRect);
            })
          ) {
            return false;
          }
          const x = Math.min(Math.max((visibleRect.left + visibleRect.right) / 2, 0), Math.max(window.innerWidth - 1, 0));
          const y = Math.min(Math.max((visibleRect.top + visibleRect.bottom) / 2, 0), Math.max(window.innerHeight - 1, 0));
          const topElement = document.elementFromPoint(x, y);
          return topElement === element || element.contains(topElement);
        };
        const matches = Array.from(document.querySelectorAll('iframe')).filter((frame) => frame.src === targetUrl);
        return { count: matches.length, visible: matches.length === 1 && isVisible(matches[0]) };
      })()`,
      { timeoutMs: remaining(deadline, 2000) }
    )
    .catch(() => undefined);
  return result?.count === 1 && result.visible === true;
}

async function getMainFrameIdFromCdp(cdp: CdpClient, deadline: number): Promise<string | undefined> {
  return getMainFrameId(await cdp.send('Page.getFrameTree', undefined, { timeoutMs: remaining(deadline, 2000) }));
}

function getMainFrameInfo(frameTree: unknown): { id?: string; parentId?: string } {
  const frame = (frameTree as { result?: { frameTree?: { frame?: { id?: string; parentId?: string } } } } | undefined)?.result?.frameTree
    ?.frame;
  return { id: frame?.id, parentId: frame?.parentId };
}

function getSemanticMetadataFrameId(cdp: CdpClient, contextId: number | undefined): string | undefined {
  if (contextId === undefined || !cdp.getExecutionContextFrameId) {
    return undefined;
  }
  return cdp.getExecutionContextFrameId(contextId);
}

function getFrameIds(frameTree: unknown): string[] {
  const root = (frameTree as { result?: { frameTree?: unknown } } | undefined)?.result?.frameTree;
  const ids: string[] = [];
  const visit = (node: unknown) => {
    const value = node as { frame?: { id?: string }; childFrames?: unknown[] };
    if (value?.frame?.id) {
      ids.push(value.frame.id);
    }
    for (const child of value.childFrames ?? []) {
      visit(child);
    }
  };
  visit(root);
  return ids;
}

async function getSemanticContextBinding(
  semanticCdp: CdpClient,
  contextId: number | undefined,
  expectedText: SemanticTextGroup[],
  deadline: number,
  requiredSelector?: string
): Promise<{ ok: boolean; visible: boolean; text: string; requiredSelectorFound: boolean }> {
  return semanticCdp.evaluate<{ ok: boolean; visible: boolean; text: string; requiredSelectorFound: boolean }>(
    contextId,
    `(() => {
      const expectedText = ${JSON.stringify(expectedText)};
      const requiredSelector = ${JSON.stringify(requiredSelector)};
      const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement) || !(element.offsetWidth || element.offsetHeight || element.getClientRects().length)) {
          return false;
        }
        const style = getComputedStyle(element);
        return (
          !element.hidden &&
          element.getAttribute('aria-hidden') !== 'true' &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.visibility !== 'collapse' &&
          Number.parseFloat(style.opacity || '1') > 0
        );
      };
      const controlText = Array.from(
        document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"], [role="combobox"], button, [aria-label], [title]')
      )
        .map((element) => [
          element.textContent,
          'value' in element ? element.value : '',
          element.getAttribute?.('aria-label'),
          element.getAttribute?.('placeholder'),
          element.getAttribute?.('title'),
          element.getAttribute?.('value'),
        ].filter(Boolean).join(' '))
        .join(' ');
      const text = [document.body?.innerText || document.body?.textContent || '', controlText].filter(Boolean).join(' ');
      const visible = document.visibilityState !== 'hidden' && document.hidden !== true;
      const requiredSelectorFound = requiredSelector ? Array.from(document.querySelectorAll(requiredSelector)).some(isVisible) : true;
      const normalizedText = normalize(text);
      const hasExpectedText = (value) =>
        Array.isArray(value)
          ? value.some((variant) => normalizedText.includes(normalize(variant)))
          : normalizedText.includes(normalize(value));
      return {
        ok: visible && requiredSelectorFound && expectedText.every(hasExpectedText),
        visible,
        text,
        requiredSelectorFound,
      };
    })()`,
    { timeoutMs: remaining(deadline, 2000) }
  );
}

function canWaitForSemanticReadiness(expectation: ScreenshotExpectation): boolean {
  return expectation.kind === 'discovery';
}

async function reacquireSemanticContext(
  semanticCdp: CdpClient,
  expectedText: SemanticTextGroup[],
  deadline: number,
  expectedFrameId?: string,
  requiredSelector?: string
): Promise<number | undefined> {
  const contextIds = semanticCdp.getExecutionContextIds?.() ?? [];
  const matchingContextIds: number[] = [];
  for (const candidateContextId of contextIds) {
    if (expectedFrameId && semanticCdp.getExecutionContextFrameId?.(candidateContextId) !== expectedFrameId) {
      continue;
    }
    const candidate = await getSemanticContextBinding(semanticCdp, candidateContextId, expectedText, deadline, requiredSelector).catch(
      () => undefined
    );
    if (candidate?.ok) {
      matchingContextIds.push(candidateContextId);
    }
  }

  if (matchingContextIds.length === 1) {
    return matchingContextIds[0];
  }

  if (matchingContextIds.length > 1) {
    throw new Error(`Screenshot binding failed: semantic context is ambiguous for ${formatSemanticTextGroups(expectedText)}`);
  }

  throw new Error(
    `Screenshot binding failed: semantic context is not visible or no longer matches ${formatSemanticTextGroups(expectedText)}`
  );
}

function deriveSemanticText(expectation: ScreenshotExpectation): SemanticTextGroup[] {
  switch (expectation.kind) {
    case 'createWorkspace':
      return [
        ...(expectation.stage === 'initial' || expectation.stage === 'review' ? ['Create logic app workspace'] : []),
        ...(expectation.stage === 'validation' ? (expectation.fields ?? []).flatMap((field) => field.labels ?? []) : []),
        ...(expectation.stage === 'fields-valid' || expectation.stage === 'scrolled' ? ['Next'] : []),
        ...(expectation.requiredText ?? []),
      ];
    case 'designerCanvas':
      return expectation.requiredNodes ?? [];
    case 'designerPanel':
      return [
        expectation.actionTitle,
        ...(expectation.requiredText ?? []),
        ...(expectation.fields ?? []).flatMap((field) => field.value ?? []),
        ...(expectation.switches ?? []).flatMap((expected) => [
          ...(expected.labels ?? []),
          ...(expected.stateText ? [expected.stateText] : []),
        ]),
      ];
    case 'overview':
      return [expectation.workflowName, expectation.runName, expectation.runStatus].filter((value): value is string => !!value);
    case 'monitoringAction':
      return [expectation.actionTitle, expectation.expectedStatus, ...(expectation.expectedValues ?? [])].filter(
        (value): value is string => !!value
      );
    case 'discovery':
      return ['Search', expectation.searchText].filter((value): value is string => !!value);
    default:
      return [];
  }
}

function formatSemanticTextGroups(expectedText: SemanticTextGroup[]): string {
  return expectedText.map((value) => (Array.isArray(value) ? `[${value.join(' | ')}]` : value)).join(', ');
}

function deriveSemanticRequiredSelector(expectation: ScreenshotExpectation): string | undefined {
  switch (expectation.kind) {
    case 'discovery':
      return [
        '[data-automation-id="msla-search-box"]',
        '.msla-search-box',
        'input',
        '[role="searchbox"]',
        '[role="combobox"]',
        '[contenteditable="true"]',
        '[data-automation-id="msla-search-box"] input',
        '.msla-search-box input',
      ].join(', ');
    case 'designerCanvas':
      return '.react-flow, [data-automation-id^="card-"], [data-testid^="card-"]';
    case 'designerPanel':
      return expectation.picker
        ? [
            '[role="dialog"]',
            '[role="listbox"]',
            '[data-automation-id*="picker"]',
            '[data-testid*="picker"]',
            '[class*="picker"]',
            '[class*="Picker"]',
            '.msla-token-picker',
            '.msla-token-picker-section',
            '.msla-token-picker-section-option',
            '[data-automation-id^="msla-token-picker-section-option-"]',
          ].join(', ')
        : undefined;
    default:
      return undefined;
  }
}

function normalizedIncludes(source: string, expected: string): boolean {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  return normalize(source).includes(normalize(expected));
}

function appendFailureAttachment(entry: FailureScreenshotAttachment): void {
  screenshotFileSystem.mkdirSync(path.dirname(failureAttachmentManifestPath), { recursive: true });
  const existingEntries = readFailureAttachments();
  screenshotFileSystem.writeFileSync(failureAttachmentManifestPath, `${JSON.stringify([...existingEntries, entry], null, 2)}\n`);
}

function readFailureAttachments(): FailureScreenshotAttachment[] {
  if (!screenshotFileSystem.existsSync(failureAttachmentManifestPath)) {
    return [];
  }

  try {
    const value = JSON.parse(screenshotFileSystem.readFileSync(failureAttachmentManifestPath, 'utf-8'));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function captureWindowsScreenshot(screenshotPath: string): Promise<void> {
  const escapedScreenshotPath = screenshotPath.replace(/'/g, "''");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size)
  $bitmap.Save('${escapedScreenshotPath}', [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}
`;
  const encodedCommand = Buffer.from(script, 'utf16le').toString('base64');

  await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Sta', '-EncodedCommand', encodedCommand], {
    timeout: 15000,
  });
}

async function sampleReadiness(
  cdp: CdpClient,
  contextId: number | undefined,
  expectation: ScreenshotExpectation,
  generation: number,
  revision: number,
  deadline: number
): Promise<ScreenshotReadinessSnapshot> {
  return cdp.evaluate<ScreenshotReadinessSnapshot>(contextId, buildScreenshotReadinessExpression(expectation, generation, revision), {
    timeoutMs: remaining(deadline, 2000),
  });
}

async function waitForStableReadiness(
  cdp: CdpClient,
  contextId: number | undefined,
  expectation: ScreenshotExpectation,
  generation: number,
  deadline: number,
  samples: ScreenshotReadinessSnapshot[]
): Promise<ScreenshotReadinessSnapshot | undefined> {
  while (Date.now() < deadline) {
    const snapshot = await sampleReadiness(cdp, contextId, expectation, cdp.contextGeneration ?? generation, 0, deadline);
    const previous = samples.at(-1);
    samples.push(snapshot);
    if (previous && isStableScreenshotSample(previous, snapshot)) {
      return snapshot;
    }
    await delay(Math.min(250, Math.max(0, deadline - Date.now())));
  }
  return undefined;
}

function disabledMetadata(safeName: string, classification: ScreenshotClassification, phase: string): ScreenshotReadinessMetadata {
  return {
    schemaVersion: 1,
    checkpoint: safeName,
    phase,
    classification,
    verdict: 'disabled',
    target: {
      owner: 'workbench',
      opaqueTargetId: 'id-00000000',
      opaqueFrameId: 'id-00000000',
      generation: 0,
    },
    timing: {
      timeoutMs: 0,
      elapsedMs: 0,
      samples: 0,
      captureAttempts: 0,
    },
    geometry: {
      viewport: { width: 0, height: 0, deviceScaleFactor: 1 },
      anchors: [],
    },
    counts: {},
    reasonCodes: ['capture-disabled'],
  };
}

function getMainFrameId(frameTree: unknown): string | undefined {
  const value = frameTree as { result?: { frameTree?: { frame?: { id?: string } } } } | undefined;
  return value?.result?.frameTree?.frame?.id;
}

function writeScreenshotMetadata(metadataPath: string, metadata: ScreenshotReadinessMetadata): void {
  screenshotFileSystem.mkdirSync(path.dirname(metadataPath), { recursive: true });
  screenshotFileSystem.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
}

function removeStaleArtifacts(screenshotPath: string, metadataPath: string): void {
  screenshotFileSystem.rmSync(screenshotPath, { force: true });
  screenshotFileSystem.rmSync(metadataPath, { force: true });
}

function remaining(deadline: number, fallbackMs: number): number {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) {
    throw new Error('Screenshot deadline exceeded');
  }
  return Math.min(fallbackMs, remainingMs);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, description: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${description}`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
