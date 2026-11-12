import * as fs from 'fs';
import * as path from 'path';
import type { CdpConnection, CdpConsoleDiagnostic } from './cdpClient';
import type { CdpEvaluator } from './cdpFormHelpers';
import {
  initializationPromptProjectPath,
  isSamePromptProjectPath,
  regenerationOverwriteMessage,
  type RegenerationPromptObservation,
} from './workspaceArtifactRegeneration';
import { readRegularWorkbenchOwnership, type RegularWorkbenchOwnershipExpectation } from './workbenchCdpActions';

type CandidateKind = 'quickInput' | 'dialog' | 'notification';
type CandidateCategory = 'initialization' | 'other-project' | 'overwrite' | 'other';
type CaptureStatus = {
  status: 'captured' | 'unavailable' | 'skipped';
  reason: string;
  checkpoint: string | null;
  postDeadline: boolean;
  registration: 'registered' | 'not-configured' | 'unavailable';
};

interface RawCandidate {
  kind: CandidateKind;
  text: string;
  displayed: boolean;
  inViewport: boolean;
  inactive: boolean;
  yesCount: number;
  visibleYesCount: number;
  disabledYesCount: number;
  ariaDisabledYesCount: number;
  obstructedYesCount: number;
}

interface RawWorkbenchState {
  timeOrigin: number;
  sampledAtMs: number;
  documentVisible: boolean;
  documentFocused: boolean;
  centerMounted: boolean;
  centerVisible: boolean;
  toastCount: number;
  retainedCount: number;
  dnd: 'on' | 'off' | 'unknown';
  truncated: boolean;
  candidates: RawCandidate[];
}

export interface SafeWorkbenchState {
  shellOwned: boolean;
  documentVisible: boolean;
  documentFocused: boolean;
  documentChanged: boolean;
  centerMounted: boolean;
  centerVisible: boolean;
  toastCount: number;
  retainedCount: number;
  dnd: 'on' | 'off' | 'unknown';
  blockingUiVisible: boolean;
  truncated: boolean;
  candidates: Array<{
    kind: CandidateKind;
    category: CandidateCategory;
    yesCount: number;
    reasonCodes: string[];
  }>;
}

const maxTimelineBytes = 512 * 1024;
const maxTimelineRecords = 1536;
const maxConsoleRecords = 128;
const maxCandidates = 16;
const sampleIntervalMs = 250;
const heartbeatIntervalMs = 1000;

/**
 * Raw text crosses only the in-memory CDP response so it can be matched with the
 * exact production selector. It is never put into a structured observation.
 */
export const regenerationDiagnosticDomScript = `(() => {
  const normalize = value => (value || '').replace(/\\s+/g, ' ').trim();
  const geometry = element => {
    if (!(element instanceof HTMLElement)) return { displayed: false, inViewport: false };
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    const displayed = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    return { displayed, inViewport: displayed && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth };
  };
  const visible = element => geometry(element).inViewport;
  const found = Array.from(document.querySelectorAll(
    '.quick-input-widget, .monaco-dialog-box, [role="dialog"], .notification-toast, .notification-list-item'
  ));
  const all = found.slice(0, 128);
  const distinct = all.filter(container => !all.some(other =>
    other !== container && other.contains(container) && geometry(other).inViewport === geometry(container).inViewport
  ));
  const candidates = distinct.slice(0, 64).map(container => {
    const g = geometry(container);
    const quick = container.classList.contains('quick-input-widget');
    const notification = container.classList.contains('notification-toast') || container.classList.contains('notification-list-item');
    const raw = normalize(container.innerText || container.textContent || '');
    const relevant = /Detected an Azure Logic App project|configuration files will be regenerated/i.test(raw);
    const allOptions = Array.from(container.querySelectorAll('a.monaco-button, button, .monaco-text-button, .monaco-list-row, [role="option"]'));
    const options = allOptions.slice(0, 128)
      .filter(option => /^yes$/i.test(normalize(option.querySelector('.label-name')?.textContent || option.textContent)));
    const states = options.map(option => {
      const state = geometry(option), rect = option.getBoundingClientRect();
      const hit = state.inViewport ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null;
      return {
        visible: state.inViewport,
        disabled: option.hasAttribute('disabled'),
        ariaDisabled: option.getAttribute('aria-disabled') === 'true',
        obstructed: state.inViewport && (!hit || (hit !== option && !option.contains(hit))),
      };
    });
    return {
      kind: quick ? 'quickInput' : notification ? 'notification' : 'dialog',
      text: relevant ? raw.slice(0, 8192) : '',
      displayed: g.displayed,
      inViewport: g.inViewport,
      inactive: quick && (container.inert || container.classList.contains('quick-input-widget-closing')),
      yesCount: Math.min(states.length, 64),
      visibleYesCount: Math.min(states.filter(state => state.visible).length, 64),
      disabledYesCount: Math.min(states.filter(state => state.disabled).length, 64),
      ariaDisabledYesCount: Math.min(states.filter(state => state.ariaDisabled).length, 64),
      obstructedYesCount: Math.min(states.filter(state => state.obstructed).length, 64),
      truncated: relevant && (raw.length > 8192 || allOptions.length > 128 || states.length > 64),
    };
  });
  const centers = Array.from(document.querySelectorAll('.notifications-center'));
  const labeled = Array.from(document.querySelectorAll('[aria-label], [title]'));
  const dndControls = labeled.slice(0, 2000).filter(element =>
    visible(element) && /do not disturb/i.test((element.getAttribute('aria-label') || '') + ' ' + (element.getAttribute('title') || ''))
  );
  const dndStates = dndControls.map(element => element.getAttribute('aria-pressed') || element.getAttribute('aria-checked'))
    .filter(value => value === 'true' || value === 'false');
  return {
    timeOrigin: performance.timeOrigin,
    sampledAtMs: Date.now(),
    documentVisible: document.visibilityState === 'visible',
    documentFocused: document.hasFocus(),
    centerMounted: centers.length > 0,
    centerVisible: centers.some(visible),
    toastCount: Math.min(document.querySelectorAll('.notification-toast').length, 64),
    retainedCount: Math.min(document.querySelectorAll('.notification-list-item').length, 64),
    dnd: labeled.length <= 2000 && dndStates.length === 1 ? (dndStates[0] === 'true' ? 'on' : 'off') : 'unknown',
    truncated: found.length > 128 || distinct.length > 64 || candidates.some(candidate => candidate.truncated),
    candidates,
  };
})()`;

function category(text: string, appDir: string, kind: CandidateKind): CandidateCategory {
  const project = initializationPromptProjectPath(text);
  if (project !== undefined) {
    return isSamePromptProjectPath(project, appDir) ? 'initialization' : 'other-project';
  }
  return kind === 'dialog' && text.includes(regenerationOverwriteMessage) ? 'overwrite' : 'other';
}

export function sanitizeRegenerationDiagnosticState(
  raw: RawWorkbenchState,
  shellOwned: boolean,
  firstTimeOrigin: number | undefined,
  appDir: string
): SafeWorkbenchState {
  const relevant = raw.candidates
    .map((candidate) => ({ candidate, category: category(candidate.text, appDir, candidate.kind) }))
    .filter((entry) => entry.category !== 'other');
  const duplicateInitialization = relevant.filter((entry) => entry.category === 'initialization' && entry.candidate.inViewport).length > 1;
  const duplicateOverwrite = relevant.filter((entry) => entry.category === 'overwrite' && entry.candidate.inViewport).length > 1;
  return {
    shellOwned,
    documentVisible: raw.documentVisible,
    documentFocused: raw.documentFocused,
    documentChanged: firstTimeOrigin !== undefined && raw.timeOrigin !== firstTimeOrigin,
    centerMounted: raw.centerMounted,
    centerVisible: raw.centerVisible,
    toastCount: raw.toastCount,
    retainedCount: raw.retainedCount,
    dnd: raw.dnd,
    blockingUiVisible: raw.candidates.some((candidate) => candidate.kind !== 'notification' && candidate.inViewport && !candidate.inactive),
    truncated: raw.truncated || relevant.length > maxCandidates,
    candidates: relevant.slice(0, maxCandidates).map(({ candidate, category: candidateCategory }) => {
      const reasonCodes: string[] = [];
      if (candidateCategory === 'other-project') {
        reasonCodes.push('wrong-project');
      }
      if (!candidate.displayed) {
        reasonCodes.push('hidden');
      } else if (!candidate.inViewport) {
        reasonCodes.push('out-of-viewport');
      }
      if (candidate.inactive) {
        reasonCodes.push('inactive');
      }
      if (candidate.yesCount === 0) {
        reasonCodes.push('missing-yes');
      } else if (candidate.visibleYesCount === 0) {
        reasonCodes.push('yes-not-visible');
      }
      if (candidate.disabledYesCount > 0) {
        reasonCodes.push('disabled-yes');
      }
      if (candidate.ariaDisabledYesCount > 0) {
        reasonCodes.push('aria-disabled-yes');
      }
      if (candidate.obstructedYesCount > 0) {
        reasonCodes.push('obstructed-yes');
      }
      if (
        (candidateCategory === 'initialization' && duplicateInitialization) ||
        (candidateCategory === 'overwrite' && duplicateOverwrite)
      ) {
        reasonCodes.push('duplicate-candidate');
      }
      if (!shellOwned) {
        reasonCodes.push('workbench-not-owned');
      }
      if (firstTimeOrigin !== undefined && raw.timeOrigin !== firstTimeOrigin) {
        reasonCodes.push('document-changed');
      }
      if (reasonCodes.length === 0) {
        reasonCodes.push('candidate-observed');
      }
      return { kind: candidate.kind, category: candidateCategory, yesCount: candidate.yesCount, reasonCodes };
    }),
  };
}

/** Replaces the old raw prompt text/coordinates in the existing observation log. */
export function summarizeRegenerationPromptObservation(observation: RegenerationPromptObservation, appDir: string, missingCount: number) {
  const candidates = observation.containers.map((container) => {
    const candidateCategory = category(container.text, appDir, container.kind);
    const yes = container.buttons.filter((button) => button.text.trim().toLowerCase() === 'yes');
    return {
      kind: container.kind,
      category: candidateCategory,
      yesCount: Math.min(yes.length, 64),
      hitTestableYesCount: Math.min(yes.filter((button) => Boolean(button.point)).length, 64),
    };
  });
  return {
    ready: observation.ready,
    missingTargetCount: missingCount,
    containerCount: Math.min(candidates.length, 64),
    candidates: candidates.filter((candidate) => candidate.category !== 'other').slice(0, maxCandidates),
    truncated: candidates.length > 64,
  };
}

export function regenerationPromptObservationForLog(
  observation: RegenerationPromptObservation,
  appDir: string,
  missingTargets: readonly string[],
  diagnosticOnly: boolean
) {
  if (diagnosticOnly) {
    return summarizeRegenerationPromptObservation(observation, appDir, missingTargets.length);
  }
  return {
    ready: observation.ready,
    timeOrigin: observation.timeOrigin,
    missingTargets,
    containers: observation.containers.map((container) => ({
      kind: container.kind,
      text: container.text,
      buttons: container.buttons.map((button) => ({
        text: button.text,
        hitTestable: Boolean(button.point),
        point: button.point,
      })),
    })),
  };
}

export class RegenerationInputTracker {
  pending = 0;
  uncertain = false;

  async send<T>(method: string, action: () => Promise<T>): Promise<T> {
    if (!method.startsWith('Input.')) {
      return action();
    }
    this.pending++;
    try {
      return await action();
    } catch (error) {
      this.uncertain = true;
      throw error;
    } finally {
      this.pending--;
    }
  }
}

/** Bounded, best-effort collection; it never throws into the native assertions. */
export class RegenerationObservation {
  readonly input = new RegenerationInputTracker();
  readonly screenshots: { beforeTeardown: CaptureStatus; notificationCenter: CaptureStatus };
  private fd: number | undefined;
  private rootSafe = false;
  private rootIdentity: { dev: number; ino: number } | undefined;
  private sequence = 0;
  private bytes = 0;
  private dropped = 0;
  private writeFailed = false;
  private pollCount = 0;
  private sampleCount = 0;
  private sampleErrorCount = 0;
  private ownershipLossCount = 0;
  private finalSampleSucceeded = false;
  private maxSampleGapMs = 0;
  private firstSampleAt: number | undefined;
  private lastSampleAt: number | undefined;
  private lastHeartbeatAt = 0;
  private firstTimeOrigin: number | undefined;
  private previousState = '';
  private latestState: SafeWorkbenchState | undefined;
  private decisionState: SafeWorkbenchState | null = null;
  private decisionSampleCaptured = false;
  private cdp: CdpConnection | undefined;
  private detachConsole: (() => void) | undefined;
  private consoleCount = 0;
  private consoleRecorded = 0;
  private consoleDropped = 0;
  private consolePreOwnedDiscarded = 0;
  private consoleListenerRegistration: 'not-attempted' | 'registered' | 'failed' = 'not-attempted';
  private consoleListenerFailureCount = 0;
  private logDomain: 'enabled' | 'pending' | 'unavailable' = 'unavailable';
  private timer: NodeJS.Timeout | undefined;
  private inFlight: Promise<void> | undefined;
  private stopped = false;
  private owned = false;
  private everOwned = false;
  private ownershipProvedAt: number | undefined;
  private ownershipGeneration: number | undefined;
  private attachAt: number | undefined;

  constructor(
    private readonly root: string,
    private readonly phase: string,
    private readonly invocation: string,
    private readonly deadline: number,
    private readonly expectation: RegularWorkbenchOwnershipExpectation,
    private readonly appDir: string
  ) {
    const initial: CaptureStatus = {
      status: 'unavailable',
      reason: 'not-attempted',
      checkpoint: null,
      postDeadline: false,
      registration: 'unavailable',
    };
    this.screenshots = { beforeTeardown: { ...initial }, notificationCenter: { ...initial } };
    try {
      const stat = fs.lstatSync(root);
      const actual = fs.realpathSync(root);
      const sameRoot =
        process.platform === 'win32' ? path.resolve(root).toLowerCase() === actual.toLowerCase() : path.resolve(root) === actual;
      if (!stat.isDirectory() || stat.isSymbolicLink() || !sameRoot) {
        throw new Error('unsafe root');
      }
      this.rootSafe = true;
      this.rootIdentity = { dev: stat.dev, ino: stat.ino };
      this.fd = fs.openSync(path.join(root, `${phase}-detector-timeline.jsonl`), 'wx', 0o600);
    } catch {
      this.writeFailed = true;
    }
  }

  boundary(
    event:
      | 'phase-start'
      | 'arm-ready'
      | 'arm-unavailable'
      | 'spawn-requested'
      | 'spawn-observed'
      | 'attach-start'
      | 'attach-owned'
      | 'decision'
      | 'teardown-start'
  ): void {
    this.emit(event, {});
  }

  onConnection(cdp: CdpConnection): void {
    try {
      this.detachConsole = cdp.onConsoleDiagnostic(
        (event) => {
          const receivedAt = Date.now();
          if (
            this.stopped ||
            !this.owned ||
            this.ownershipProvedAt === undefined ||
            this.ownershipGeneration !== cdp.contextGeneration ||
            event.timestamp === null ||
            !Number.isFinite(event.timestamp) ||
            event.timestamp <= this.ownershipProvedAt ||
            event.timestamp > receivedAt
          ) {
            this.consolePreOwnedDiscarded = Math.min(1_000_000, this.consolePreOwnedDiscarded + 1);
            return;
          }
          this.recordConsole(event, receivedAt);
        },
        () => {
          this.consoleListenerFailureCount = Math.min(1_000_000, this.consoleListenerFailureCount + 1);
        }
      );
      if (typeof this.detachConsole !== 'function') {
        throw new Error('registration unavailable');
      }
      this.consoleListenerRegistration = 'registered';
    } catch {
      this.consoleListenerRegistration = 'failed';
      console.warn('[workspace-regeneration-diagnostics] console-listener-registration-failed');
    }
  }

  start(cdp: CdpConnection, timeOrigin?: number): void {
    this.cdp = cdp;
    this.firstTimeOrigin = timeOrigin;
    this.logDomain = 'pending';
    cdp.send('Log.enable', undefined, { timeoutMs: 1000 }).then(
      () => {
        this.logDomain = 'enabled';
      },
      () => {
        this.logDomain = 'unavailable';
      }
    );
    this.schedule(0);
  }

  private recordConsole(event: CdpConsoleDiagnostic, receivedAt: number): void {
    this.consoleCount = Math.min(1_000_000, this.consoleCount + 1);
    if (this.consoleRecorded >= maxConsoleRecords) {
      this.consoleDropped = Math.min(1_000_000, this.consoleDropped + 1);
      return;
    }
    const types = [
      'log',
      'debug',
      'info',
      'error',
      'warning',
      'assert',
      'trace',
      'dir',
      'table',
      'count',
      'timeEnd',
      'entry',
      'exception',
      'other',
    ];
    const severities = ['error', 'warning', 'info', 'debug', 'unknown'];
    const recorded = this.emit('renderer-console', {
      source: event.source === 'runtime' || event.source === 'log' ? event.source : 'runtime',
      type: types.includes(event.type) ? event.type : 'other',
      severity: severities.includes(event.severity) ? event.severity : 'unknown',
      receivedAtUtc: new Date(receivedAt).toISOString(),
    });
    if (recorded) {
      this.consoleRecorded++;
    } else {
      this.consoleDropped = Math.min(1_000_000, this.consoleDropped + 1);
    }
  }

  private emit(event: string, fields: Record<string, unknown>): boolean {
    if (this.fd === undefined || this.writeFailed) {
      return false;
    }
    const line = `${JSON.stringify({
      schemaVersion: 1,
      invocation: this.invocation,
      phase: this.phase,
      sequence: this.sequence + 1,
      timestampUtc: new Date().toISOString(),
      event,
      ...fields,
    })}\n`;
    const bytes = Buffer.byteLength(line);
    if (this.sequence >= maxTimelineRecords || this.bytes + bytes > maxTimelineBytes) {
      this.dropped++;
      return false;
    }
    try {
      if (fs.writeSync(this.fd, line) !== bytes) {
        this.writeFailed = true;
        return false;
      }
      this.sequence++;
      this.bytes += bytes;
      return true;
    } catch {
      this.writeFailed = true;
      return false;
    }
  }

  private schedule(delay: number): void {
    if (this.stopped || Date.now() >= this.deadline) {
      return;
    }
    this.timer = setTimeout(() => {
      this.inFlight = this.sample(this.deadline).finally(() => {
        this.inFlight = undefined;
        this.schedule(sampleIntervalMs);
      });
    }, delay);
    this.timer.unref();
  }

  private async sample(sampleDeadline: number, finalSample = false): Promise<void> {
    if (finalSample) {
      this.finalSampleSucceeded = false;
    }
    if (!this.cdp || Date.now() >= sampleDeadline) {
      if (finalSample) {
        this.pollCount++;
        this.sampleErrorCount++;
        this.owned = false;
        this.latestState = undefined;
        this.emit('detector-poll', {
          outcome: 'unavailable',
          pollCount: this.pollCount,
          sampleCount: this.sampleCount,
          sampledAtUtc: null,
          attemptedAtUtc: new Date().toISOString(),
          finalSample: true,
          reason: this.cdp ? 'cdp-timeout' : 'cdp-observation-failed',
        });
      }
      return;
    }
    // Shell admission is not enough to bind buffered console events to the
    // intended workspace. Suspend attribution until this paired sample proves
    // both workspace ownership and the same document again.
    this.owned = false;
    this.ownershipProvedAt = undefined;
    this.ownershipGeneration = undefined;
    const cdp = this.cdp;
    const budget = () => Math.max(1, Math.min(750, sampleDeadline - Date.now()));
    const bounded: CdpEvaluator = {
      evaluate: (contextId, expression, options) =>
        cdp.evaluate(contextId, expression, { timeoutMs: Math.min(options?.timeoutMs ?? 750, budget()) }),
      send: (method, params, options) => cdp.send(method, params, { timeoutMs: Math.min(options?.timeoutMs ?? 750, budget()) }),
    };
    this.pollCount++;
    const attemptedAt = Date.now();
    try {
      const before = await readRegularWorkbenchOwnership(bounded, this.expectation);
      const raw = await bounded.evaluate<RawWorkbenchState>(undefined, regenerationDiagnosticDomScript);
      const owner = await readRegularWorkbenchOwnership(bounded, this.expectation);
      const now = Date.now();
      const sampledAt = raw.sampledAtMs;
      if (
        !Number.isSafeInteger(sampledAt) ||
        sampledAt < attemptedAt ||
        sampledAt > now ||
        (this.lastSampleAt !== undefined && sampledAt < this.lastSampleAt)
      ) {
        throw new Error('sample time unavailable');
      }
      const sameDocument =
        Number.isFinite(raw.timeOrigin) &&
        Number.isFinite(before.timeOrigin) &&
        Number.isFinite(owner.timeOrigin) &&
        raw.timeOrigin === before.timeOrigin &&
        raw.timeOrigin === owner.timeOrigin &&
        (this.firstTimeOrigin === undefined || owner.timeOrigin === this.firstTimeOrigin);
      const workspaceOwned = before.owned && owner.owned;
      const shellOwned = before.shellOwned && owner.shellOwned;
      if (!workspaceOwned || !sameDocument) {
        this.ownershipLossCount++;
        this.latestState = undefined;
        this.emit('detector-poll', {
          outcome: 'unavailable',
          pollCount: this.pollCount,
          sampleCount: this.sampleCount,
          sampledAtUtc: new Date(sampledAt).toISOString(),
          finalSample,
          reason: workspaceOwned ? 'document-changed' : shellOwned ? 'workspace-root-unproved' : 'workbench-not-owned',
        });
        this.lastHeartbeatAt = now;
        return;
      }
      this.firstTimeOrigin ??= raw.timeOrigin;
      this.owned = true;
      this.ownershipProvedAt = now;
      this.ownershipGeneration = cdp.contextGeneration;
      if (!this.everOwned) {
        this.everOwned = true;
        this.attachAt = sampledAt;
        this.boundary('attach-owned');
      }
      const safe = sanitizeRegenerationDiagnosticState(raw, owner.shellOwned, this.firstTimeOrigin, this.appDir);
      if (finalSample) {
        this.finalSampleSucceeded = true;
      }
      this.sampleCount++;
      if (this.lastSampleAt !== undefined) {
        this.maxSampleGapMs = Math.max(this.maxSampleGapMs, sampledAt - this.lastSampleAt);
      }
      this.firstSampleAt ??= sampledAt;
      this.lastSampleAt = sampledAt;
      this.latestState = safe;
      const serialized = JSON.stringify(safe);
      if (finalSample || serialized !== this.previousState || now - this.lastHeartbeatAt >= heartbeatIntervalMs) {
        this.emit('detector-poll', {
          outcome: 'observed',
          pollCount: this.pollCount,
          sampleCount: this.sampleCount,
          sampledAtUtc: new Date(sampledAt).toISOString(),
          finalSample,
          state: safe,
        });
        this.previousState = serialized;
        this.lastHeartbeatAt = now;
      }
    } catch (error) {
      this.sampleErrorCount++;
      this.latestState = undefined;
      const now = Date.now();
      if (finalSample || now - this.lastHeartbeatAt >= heartbeatIntervalMs) {
        this.emit('detector-poll', {
          outcome: 'unavailable',
          pollCount: this.pollCount,
          sampleCount: this.sampleCount,
          sampledAtUtc: null,
          attemptedAtUtc: new Date(attemptedAt).toISOString(),
          finalSample,
          reason: error instanceof Error && /timed out/i.test(error.message) ? 'cdp-timeout' : 'cdp-observation-failed',
        });
        this.lastHeartbeatAt = now;
      }
    }
  }

  async stopAndSample(): Promise<SafeWorkbenchState | undefined> {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    await this.inFlight;
    await this.sample(Date.now() + 1000, true);
    if (!this.decisionSampleCaptured) {
      this.decisionState = this.latestState ?? null;
      this.decisionSampleCaptured = true;
    }
    return this.latestState;
  }

  hasSampleSince(time: number): boolean {
    return this.owned && this.finalSampleSucceeded && this.lastSampleAt !== undefined && this.lastSampleAt >= time;
  }

  async finish(decisionAt: number): Promise<void> {
    if (!this.stopped) {
      await this.stopAndSample();
    }
    try {
      this.detachConsole?.();
    } catch {
      this.consoleListenerFailureCount = Math.min(1_000_000, this.consoleListenerFailureCount + 1);
      console.warn('[workspace-regeneration-diagnostics] console-listener-detach-failed');
    }
    if (this.fd !== undefined) {
      try {
        fs.fsyncSync(this.fd);
      } catch {
        this.writeFailed = true;
      }
      try {
        fs.closeSync(this.fd);
      } catch {
        this.writeFailed = true;
      }
      this.fd = undefined;
    }
    const decisionCovered =
      this.owned &&
      this.firstSampleAt !== undefined &&
      this.firstSampleAt <= decisionAt &&
      this.lastSampleAt !== undefined &&
      this.lastSampleAt >= decisionAt &&
      this.maxSampleGapMs <= 2000 &&
      this.sampleErrorCount === 0 &&
      this.ownershipLossCount === 0 &&
      this.finalSampleSucceeded &&
      !this.latestState?.documentChanged &&
      !this.writeFailed &&
      this.dropped === 0;
    const summary = {
      schemaVersion: 1,
      suiteId: 'workspaceArtifactRegeneration',
      invocation: this.invocation,
      phase: this.phase,
      decisionAtUtc: new Date(decisionAt).toISOString(),
      attachmentScope: 'owned-regular-workbench',
      detector: {
        availability: decisionCovered ? 'available' : this.sampleCount > 0 ? 'partial' : 'unavailable',
        decisionCovered,
        samplingIsDiscrete: true,
        preAttachUnobserved: true,
        attachAtUtc: this.attachAt === undefined ? null : new Date(this.attachAt).toISOString(),
        firstSampleAtUtc: this.firstSampleAt === undefined ? null : new Date(this.firstSampleAt).toISOString(),
        lastSampleAtUtc: this.lastSampleAt === undefined ? null : new Date(this.lastSampleAt).toISOString(),
        pollCount: this.pollCount,
        sampleCount: this.sampleCount,
        sampleErrorCount: this.sampleErrorCount,
        ownershipLossCount: this.ownershipLossCount,
        finalSampleSucceeded: this.finalSampleSucceeded,
        maxSampleGapMs: this.maxSampleGapMs,
        timelineRecordCount: this.sequence,
        droppedCount: this.dropped,
        writeFailed: this.writeFailed,
      },
      console: {
        availability:
          this.everOwned && this.consoleListenerRegistration === 'registered' && this.consoleListenerFailureCount === 0 && !this.writeFailed
            ? 'partial'
            : 'unavailable',
        scope: 'renderer-only',
        preAttachUnobserved: true,
        listenerRegistration: this.consoleListenerRegistration,
        listenerFailureCount: this.consoleListenerFailureCount,
        eventCount: this.consoleCount,
        recordedCount: this.consoleRecorded,
        droppedCount: this.consoleDropped,
        preOwnedDiscardedCount: this.consolePreOwnedDiscarded,
        logDomain: this.logDomain,
      },
      notification: this.decisionState,
      screenshots: this.screenshots,
      input: { uncertain: this.input.uncertain, pending: this.input.pending > 0 },
    };
    try {
      const currentRoot = fs.lstatSync(this.root);
      const actualRoot = fs.realpathSync(this.root);
      const sameRoot =
        process.platform === 'win32'
          ? path.resolve(this.root).toLowerCase() === actualRoot.toLowerCase()
          : path.resolve(this.root) === actualRoot;
      if (
        !this.rootSafe ||
        !this.rootIdentity ||
        !currentRoot.isDirectory() ||
        currentRoot.isSymbolicLink() ||
        currentRoot.dev !== this.rootIdentity.dev ||
        currentRoot.ino !== this.rootIdentity.ino ||
        !sameRoot
      ) {
        throw new Error('unsafe root');
      }
      fs.writeFileSync(path.join(this.root, `${this.phase}-diagnostic-summary.json`), `${JSON.stringify(summary, null, 2)}\n`, {
        flag: 'wx',
        mode: 0o600,
      });
    } catch {
      console.warn('[workspace-regeneration-diagnostics] summary-write-failed');
    }
  }
}
