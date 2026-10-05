import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { connectToVsCodeWorkbenchCdp } from './cdpClient';
import { clickPoint, pressKey, type CdpEvaluator, type Point } from './cdpFormHelpers';
import { captureCdpScreenshot, captureDiagnosticScreenshot } from './screenshot';
import { selectWorkbenchPromptOption, type WorkbenchPromptContainer } from './workbenchPromptSelection';

export interface CancelWorkspace {
  appDir: string;
  workspaceFilePath: string;
  workflowJsonPath: string;
}

export function captureWorkspacePromptCancelBaseline(workspaceParent: string, workspace: CancelWorkspace) {
  const files = [
    ...['tasks.json', 'launch.json', 'settings.json', 'extensions.json'].map((name) => path.join(workspace.appDir, '.vscode', name)),
    path.join(workspace.appDir, 'host.json'),
    path.join(workspace.appDir, 'local.settings.json'),
    workspace.workflowJsonPath,
    workspace.workspaceFilePath,
  ].map((filePath) => {
    const relative = path.relative(workspaceParent, filePath);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Baseline must stay in the current wizard root');
    return { name: relative, sha256: createHash('sha256').update(fs.readFileSync(filePath)).digest('hex') };
  });
  return {
    files,
    entries: {
      workspace: fs.readdirSync(path.dirname(workspace.workspaceFilePath)).sort(),
      app: fs.readdirSync(workspace.appDir).sort(),
      vscode: fs.readdirSync(path.join(workspace.appDir, '.vscode')).sort(),
    },
  };
}

interface WorkspacePromptObservation {
  containers: WorkbenchPromptContainer[];
  refusal?: string;
  title: string;
  timeOrigin: number;
  folderNames: string[];
  tabs: string[];
}

export interface WorkspacePromptCancelPhase {
  name: 'preceding-no-setup' | 'cancel';
  startedAt: number;
  deadline: number;
}

export function createWorkspacePromptCancelPhase(name: WorkspacePromptCancelPhase['name'], startedAt = Date.now()) {
  return { name, startedAt, deadline: startedAt + 30000 };
}

export function assertWorkspacePromptCancelPhaseBudget(phase: WorkspacePromptCancelPhase, now = Date.now()): number {
  const remaining = phase.deadline - now;
  assert.ok(remaining > 0, `Actual ${phase.name} phase deadline expired`);
  return remaining;
}

export function assertWorkspacePromptCancelSettled(
  unchangedSince: number | undefined,
  phase: WorkspacePromptCancelPhase,
  now = Date.now()
): void {
  assertWorkspacePromptCancelPhaseBudget(phase, now);
  assert.ok(
    phase.name === 'cancel' && unchangedSince !== undefined && now - unchangedSince >= 1500,
    'The real dialog must dismiss and leave a stable unchanged app view'
  );
}

export async function readWorkspacePromptObservation(cdp: CdpEvaluator): Promise<WorkspacePromptObservation> {
  return cdp.evaluate(
    undefined,
    `(() => {
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) { return false; }
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' &&
          !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
      };
      const text = (element) => (element.innerText || element.textContent || '').replace(/\\s+/g, ' ').trim();
      const refusal = Array.from(document.querySelectorAll('.notification-toast, .notification-list-item'))
        .filter(visible).map(text).find((value) => value.includes('DialogService: refused to show dialog in tests') &&
          value.includes('You must open your workspace'));
      const containers = Array.from(document.querySelectorAll('.monaco-dialog-box')).filter(visible).map((container) => ({
        kind: 'dialog', text: text(container), rows: [],
        buttons: Array.from(container.querySelectorAll('button, a.monaco-button, .monaco-text-button')).filter(visible).map((button) => {
          const rect = button.getBoundingClientRect();
          const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          const hit = document.elementFromPoint(point.x, point.y);
          const enabled = button.getAttribute('aria-disabled') !== 'true' && !button.hasAttribute('disabled');
          return { text: text(button), ...(enabled && hit && (hit === button || button.contains(hit)) ? { point } : {}) };
        }),
      }));
      const folderNames = Array.from(document.querySelectorAll(
        '.explorer-viewlet .pane-header .title, .explorer-folders-view .monaco-list-row[aria-level="1"] .label-name'
      )).filter(visible).map(text);
      return { containers, refusal, title: document.title, timeOrigin: performance.timeOrigin, folderNames,
        tabs: Array.from(document.querySelectorAll('[role="tab"]')).filter(visible).map(text) };
    })()`
  );
}

export function assertExistingAppView(
  observation: Pick<WorkspacePromptObservation, 'title' | 'folderNames' | 'tabs'>,
  workspace: CancelWorkspace
): void {
  const appName = path.basename(workspace.appDir).toLowerCase();
  assert.ok(observation.title.toLowerCase().includes(appName), 'The regular development window must still show the existing app');
  assert.ok(
    observation.folderNames.some((name) => name.toLowerCase() === appName),
    'Explorer must still show the existing Logic App folder rather than its workspace'
  );
  assert.ok(!observation.tabs.some((name) => /create logic app workspace|create workspace/i.test(name)), 'Cancel must not open the wizard');
}

async function clickFileMenuCommand(cdp: CdpEvaluator, commandPattern: string, deadline: number) {
  const waitForPoint = async (selector: string, match: string): Promise<Point> => {
    while (Date.now() < deadline) {
      const point = await cdp.evaluate<Point | undefined>(
        undefined,
        `(() => {
          for (const element of document.querySelectorAll(${JSON.stringify(selector)})) {
            const text = (element.textContent || element.getAttribute('aria-label') || '').trim();
            if (!new RegExp(${JSON.stringify(match)}).test(text) || element.getAttribute('aria-disabled') === 'true') { continue; }
            const rect = element.getBoundingClientRect();
            const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            const hit = document.elementFromPoint(point.x, point.y);
            if (rect.width && rect.height && hit && (hit === element || element.contains(hit))) { return point; }
          }
        })()`
      );
      if (point) {
        return point;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
    }
    throw new Error(`The normal workbench did not expose the enabled ${match} control before the original case deadline.`);
  };
  await clickPoint(cdp, await waitForPoint('.menubar-menu-button', '^File$'));
  await clickPoint(cdp, await waitForPoint('.monaco-menu-container .action-label', commandPattern));
  const menuStillOpen = await cdp.evaluate<boolean>(
    undefined,
    `Array.from(document.querySelectorAll('.monaco-menu-container')).some((element) =>
      element.getBoundingClientRect().width > 0 && getComputedStyle(element).visibility !== 'hidden')`
  );
  if (menuStillOpen) {
    await pressKey(cdp, 'Enter', 'Enter', 13);
  }
  return waitForPoint;
}

interface OpenFolderPickerState {
  visible: boolean;
  title: string;
  value: string;
  busy: boolean;
  rowCount: number;
}

export function isOpenFolderPickerReady(picker: OpenFolderPickerState): boolean {
  return picker.visible && /open folder/i.test(picker.title) && !!picker.value && !picker.busy && picker.rowCount > 0;
}

async function readOpenFolderPicker(cdp: CdpEvaluator): Promise<OpenFolderPickerState> {
  return cdp.evaluate(
    undefined,
    `(() => {
      const widget = document.querySelector('.quick-input-widget');
      return {
        visible: !!widget?.getBoundingClientRect().width,
        title: widget?.querySelector('.quick-input-title')?.textContent || '',
        value: widget?.querySelector('input')?.value || '',
        busy: !!widget?.querySelector('.monaco-progress-container.active:not(.done)'),
        rowCount: widget?.querySelectorAll('.quick-input-list .monaco-list-row').length || 0
      };
    })()`
  );
}

async function openExistingAppThroughFileMenu(
  cdp: CdpEvaluator,
  appDir: string,
  deadline: number,
  captureScreenshot: (name: string) => Promise<void>
): Promise<void> {
  const waitForPoint = await clickFileMenuCommand(cdp, '^Open Folder(?:\\.{3}|\\u2026)?$', deadline);
  let pickerReady = false;
  while (Date.now() < deadline) {
    pickerReady = isOpenFolderPickerReady(await readOpenFolderPicker(cdp));
    if (pickerReady) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
  }
  assert.ok(pickerReady, 'The real File menu must finish loading the actual stock Open Folder picker before input');
  const input = await waitForPoint('.quick-input-widget input', '.*');
  await clickPoint(cdp, input);
  const modifiers = process.platform === 'darwin' ? 4 : 2;
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers, windowsVirtualKeyCode: 65 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers, windowsVirtualKeyCode: 65 });
  await cdp.send('Input.insertText', { text: `${appDir}${path.sep}` });
  let picker = await readOpenFolderPicker(cdp);
  let settledSince: number | undefined;
  while (Date.now() < deadline) {
    picker = await readOpenFolderPicker(cdp);
    if (isOpenFolderPickerReady(picker) && path.normalize(picker.value) === path.normalize(`${appDir}${path.sep}`)) {
      settledSince ??= Date.now();
      if (Date.now() - settledSince >= 250) {
        break;
      }
    } else {
      settledSince = undefined;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, deadline - Date.now())));
  }
  assert.ok(settledSince && Date.now() - settledSince >= 250, 'The stock picker must finish resolving the typed existing app path');
  assert.ok(/open folder/i.test(picker.title), 'The real File menu must open the stock Open Folder picker');
  assert.strictEqual(
    path.normalize(picker.value),
    path.normalize(`${appDir}${path.sep}`),
    'The real picker must contain the existing app path'
  );
  await captureScreenshot('workspace-prompt-cancel-ui-open-folder');
  assert.strictEqual(
    path.normalize((await readOpenFolderPicker(cdp)).value),
    path.normalize(`${appDir}${path.sep}`),
    'The captured real picker must retain the existing app path before submission'
  );
  await pressKey(cdp, 'Enter', 'Enter', 13);
  console.log(
    '[workspacePromptCancelUI] Clicked File -> Open Folder; typed the already-created app path into the stock folder picker and submitted it.'
  );
}

export async function runWorkspacePromptCancelUi(
  workspaceParent: string,
  workspace: CancelWorkspace,
  baseline: ReturnType<typeof captureWorkspacePromptCancelBaseline>
): Promise<{
  scenario: 'workspace-prompt-cancel';
  route: string;
  realCancelMouseInput: true;
  realPrecedingNoMouseInput: true;
  samples: number;
  screenshots: string[];
  before: ReturnType<typeof captureWorkspacePromptCancelBaseline>;
  after: ReturnType<typeof captureWorkspacePromptCancelBaseline>;
  noReload: true;
  initialFiles: ReturnType<typeof captureWorkspacePromptCancelBaseline>['files'];
  initialDirectories: ReturnType<typeof captureWorkspacePromptCancelBaseline>['entries'];
  postNoDirectories: ReturnType<typeof captureWorkspacePromptCancelBaseline>['entries'];
  phaseTimings: Array<{ phase: WorkspacePromptCancelPhase['name']; event: string; elapsedMs: number; remainingMs: number }>;
}> {
  let phase = createWorkspacePromptCancelPhase('preceding-no-setup');
  let deadline = phase.deadline;
  const remaining = () => Math.min(1500, assertWorkspacePromptCancelPhaseBudget(phase));
  const phaseTimings: Array<{ phase: WorkspacePromptCancelPhase['name']; event: string; elapsedMs: number; remainingMs: number }> = [];
  const recordPhase = (event: string) => {
    const now = Date.now();
    const timing = { phase: phase.name, event, elapsedMs: now - phase.startedAt, remainingMs: phase.deadline - now };
    phaseTimings.push(timing);
    console.log(`[workspacePromptCancelUI] Phase timing: ${JSON.stringify(timing)}`);
  };
  recordPhase('started');
  let cdp = await connectToVsCodeWorkbenchCdp({
    activate: false,
    waitForServer: true,
    timeoutMs: Math.min(15000, deadline - Date.now()),
  });
  const boundedCdp: CdpEvaluator = {
    evaluate: (context, expression) => cdp.evaluate(context, expression, { timeoutMs: remaining() }),
    send: (method, params) => cdp.send(method, params, { timeoutMs: remaining() }),
  };
  const captureScreenshot = (name: string) => captureRequiredCancelScreenshot(cdp, name, deadline);
  let lastObservation: WorkspacePromptObservation | undefined;
  let promptBefore: WorkspacePromptObservation | undefined;
  let cancelBaseline = baseline;
  let precedingNoObserved = false;
  let postNoDirectories = baseline.entries;
  try {
    await boundedCdp.send('Page.bringToFront');
    await openExistingAppThroughFileMenu(boundedCdp, workspace.appDir, deadline, captureScreenshot);
    cdp.dispose();
    cdp = await connectToVsCodeWorkbenchCdp({ activate: false, waitForServer: true, timeoutMs: Math.min(15000, deadline - Date.now()) });
    while (Date.now() < deadline) {
      lastObservation = await readWorkspacePromptObservation(boundedCdp);
      if (lastObservation.refusal) {
        throw new Error(`VS Code refused the real workspace dialog: ${lastObservation.refusal}`);
      }
      const containers = lastObservation.containers.filter(
        (container) =>
          container.text.includes('You must open your workspace to use the full functionality') &&
          container.text.toLowerCase().includes(workspace.workspaceFilePath.toLowerCase())
      );
      const cancel = selectWorkbenchPromptOption(
        [{ matchText: 'Do you want to open this workspace now?', optionText: precedingNoObserved ? 'Cancel' : 'No' }],
        containers
      );
      if (cancel.visible) {
        if (!precedingNoObserved) {
          assert.ok(cancel.point, 'The preceding source step must offer the real enabled No button');
          assertExistingAppView(lastObservation, workspace);
          const noTimeOrigin = lastObservation.timeOrigin;
          await captureScreenshot('workspace-prompt-cancel-ui-preceding-no');
          await clickPoint(boundedCdp, cancel.point);
          while (Date.now() < deadline) {
            const observation = await readWorkspacePromptObservation(boundedCdp);
            assertExistingAppView(observation, workspace);
            assert.strictEqual(observation.timeOrigin, noTimeOrigin, 'The real preceding No must not reopen/reload the workspace');
            assert.deepStrictEqual(
              captureWorkspacePromptCancelBaseline(workspaceParent, workspace).files,
              baseline.files,
              'The real preceding No must preserve all eight original wizard-file hashes'
            );
            if (
              observation.containers.length === 0 &&
              fs.existsSync(path.join(workspace.appDir, 'workflow-designtime', 'host.json')) &&
              fs.existsSync(path.join(workspace.appDir, 'workflow-designtime', 'local.settings.json'))
            ) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
          }
          remaining();
          assert.deepStrictEqual(
            captureWorkspacePromptCancelBaseline(workspaceParent, workspace).files,
            baseline.files,
            'The real preceding No must preserve the original wizard files'
          );
          precedingNoObserved = true;
          postNoDirectories = captureWorkspacePromptCancelBaseline(workspaceParent, workspace).entries;
          console.log(
            '[workspacePromptCancelUI] Preceding source Open Folder -> real No completed on the same app; ordinary activation initialized it.'
          );
          await clickFileMenuCommand(boundedCdp, '^Close Folder$', deadline);
          cdp.dispose();
          cdp = await connectToVsCodeWorkbenchCdp({
            activate: false,
            waitForServer: true,
            timeoutMs: Math.min(15000, deadline - Date.now()),
          });
          while (Date.now() < deadline) {
            const empty = await readWorkspacePromptObservation(boundedCdp);
            if (
              empty.timeOrigin !== noTimeOrigin &&
              !empty.folderNames.length &&
              !empty.title.toLowerCase().includes(path.basename(workspace.appDir).toLowerCase())
            ) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
          }
          remaining();
          recordPhase('completed');
          phase = createWorkspacePromptCancelPhase('cancel');
          deadline = phase.deadline;
          recordPhase('started');
          await openExistingAppThroughFileMenu(boundedCdp, workspace.appDir, deadline, captureScreenshot);
          cdp.dispose();
          cdp = await connectToVsCodeWorkbenchCdp({
            activate: false,
            waitForServer: true,
            timeoutMs: Math.min(15000, deadline - Date.now()),
          });
          continue;
        }
        assert.ok(cancel.point, 'The actual workspace dialog must offer an enabled, unobstructed Cancel');
        assertExistingAppView(lastObservation, workspace);
        // Opening the folder can initialize app directories; Cancel must change nothing from the actual prompt state.
        let stableSince = Date.now();
        cancelBaseline = captureWorkspacePromptCancelBaseline(workspaceParent, workspace);
        while (Date.now() - stableSince < 1500) {
          remaining();
          await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
          const current = captureWorkspacePromptCancelBaseline(workspaceParent, workspace);
          assert.deepStrictEqual(current.files, baseline.files, 'Folder navigation must preserve the original eight wizard-created files');
          if (JSON.stringify(current) !== JSON.stringify(cancelBaseline)) {
            stableSince = Date.now();
            cancelBaseline = current;
          }
        }
        lastObservation = await readWorkspacePromptObservation(boundedCdp);
        assertExistingAppView(lastObservation, workspace);
        assert.ok(
          lastObservation.containers.some((container) => container.text.includes('Do you want to open this workspace now?')),
          'Real prompt must remain visible before Cancel'
        );
        promptBefore = lastObservation;
        await captureScreenshot('workspace-prompt-cancel-ui-before');
        cancelBaseline = captureWorkspacePromptCancelBaseline(workspaceParent, workspace);
        assert.deepStrictEqual(
          cancelBaseline.files,
          baseline.files,
          'Immediately before Cancel all eight original wizard hashes must remain intact'
        );
        await clickPoint(boundedCdp, cancel.point);
        console.log('[workspacePromptCancelUI] Actual workspace prompt observed; trusted mouse input sent to its real Cancel.');
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
    }
    assert.ok(promptBefore, `The real workspace prompt/Cancel was not found: ${JSON.stringify(lastObservation)}`);
    let unchangedSince: number | undefined;
    let samples = 0;
    while (Date.now() < deadline) {
      lastObservation = await readWorkspacePromptObservation(boundedCdp);
      assertExistingAppView(lastObservation, workspace);
      assert.strictEqual(lastObservation.timeOrigin, promptBefore.timeOrigin, 'Cancel must not reload or replace the window');
      assert.deepStrictEqual(
        captureWorkspacePromptCancelBaseline(workspaceParent, workspace),
        cancelBaseline,
        'Cancel must not change the eight original file digests or project/workspace directory entries'
      );
      assert.ok(!lastObservation.refusal, `The ordinary workbench rejected the dialog: ${lastObservation.refusal}`);
      if (lastObservation.containers.length === 0) {
        unchangedSince ??= Date.now();
        samples++;
        if (Date.now() - unchangedSince >= 1500) {
          break;
        }
      } else {
        unchangedSince = undefined;
        samples = 0;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
    }
    assertWorkspacePromptCancelSettled(unchangedSince, phase);
    await captureScreenshot('workspace-prompt-cancel-ui-after');
    assertWorkspacePromptCancelSettled(unchangedSince, phase);
    recordPhase('completed');
    console.log(
      `[workspacePromptCancelUI] PASS: actual Cancel dismissed the prompt; app view and eight original files unchanged (${samples} samples).`
    );
    return {
      scenario: 'workspace-prompt-cancel',
      route: 'File -> Open Folder -> stock folder picker -> existing app',
      realCancelMouseInput: true,
      realPrecedingNoMouseInput: true,
      samples,
      noReload: true,
      initialFiles: baseline.files,
      initialDirectories: baseline.entries,
      postNoDirectories,
      phaseTimings,
      screenshots: [
        'workspace-prompt-cancel-ui-open-folder.png',
        'workspace-prompt-cancel-ui-before.png',
        'workspace-prompt-cancel-ui-after.png',
        'workspace-prompt-cancel-ui-preceding-no.png',
      ],
      before: cancelBaseline,
      after: captureWorkspacePromptCancelBaseline(workspaceParent, workspace),
    };
  } catch (error) {
    recordPhase('failed');
    await captureDiagnosticScreenshot('workspace-prompt-cancel-ui-failure', {
      reason: error instanceof Error ? error.message : String(error),
      timeoutMs: 1500,
    });
    throw error;
  } finally {
    cdp.dispose();
  }
}

export async function closeWorkspacePromptCancelWindow(observationFailed = false): Promise<void> {
  const cdp = await connectToVsCodeWorkbenchCdp({ activate: false, waitForServer: true, timeoutMs: 5000 });
  try {
    if (observationFailed) {
      // Dismiss failed-run UI only; successful observation closes directly.
      await cdp.send(
        'Input.dispatchKeyEvent',
        { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
        { timeoutMs: 1500 }
      );
      await cdp.send(
        'Input.dispatchKeyEvent',
        { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
        { timeoutMs: 1500 }
      );
    }
    const modifiers = process.platform === 'darwin' ? 12 : 10;
    await cdp.send(
      'Input.dispatchKeyEvent',
      { type: 'keyDown', key: 'W', code: 'KeyW', modifiers, windowsVirtualKeyCode: 87 },
      { timeoutMs: 1500 }
    );
    await cdp.send(
      'Input.dispatchKeyEvent',
      { type: 'keyUp', key: 'W', code: 'KeyW', modifiers, windowsVirtualKeyCode: 87 },
      { timeoutMs: 1500 }
    );
  } finally {
    cdp.dispose();
  }
}

export function workspacePromptCancelScreenshotOptions(name: string, deadline: number) {
  const timeoutMs = Math.min(5000, deadline - Date.now());
  assert.ok(timeoutMs > 0, 'Required Cancel screenshot must stay within the original case deadline');
  return {
    classification: 'evidence' as const,
    expectation: { kind: 'workbenchShell' as const, label: name },
    timeoutMs,
    deadlineMs: Math.min(deadline, Date.now() + timeoutMs),
  };
}

export async function captureRequiredCancelScreenshot(
  cdp: Parameters<typeof captureCdpScreenshot>[0],
  name: string,
  deadline: number
): Promise<void> {
  const captureCdp: Parameters<typeof captureCdpScreenshot>[0] = {
    targetId: cdp.targetId,
    targetUrl: cdp.targetUrl,
    targetTitle: cdp.targetTitle,
    get contextGeneration() {
      return cdp.contextGeneration;
    },
    getExecutionContextIds: () => cdp.getExecutionContextIds?.() ?? [],
    getExecutionContextFrameId: (contextId) => cdp.getExecutionContextFrameId?.(contextId),
    evaluate: (contextId, expression, options) => cdp.evaluate(contextId, expression, options),
    send: async (method, params, options) => {
      try {
        return await cdp.send(method, params, options);
      } catch (error) {
        if (method === 'Page.captureScreenshot') {
          console.error(
            `[workspacePromptCancelUI] Original required capture RPC failed: ${JSON.stringify({
              checkpoint: name,
              command: method,
              targetId: cdp.targetId,
              generation: cdp.contextGeneration,
              timeoutMs: options?.timeoutMs,
              remainingMs: deadline - Date.now(),
              error: error instanceof Error ? error.stack || error.message : String(error),
            })}`
          );
        }
        throw error;
      }
    },
  };
  const file = await captureCdpScreenshot(captureCdp, name, workspacePromptCancelScreenshotOptions(name, deadline));
  assert.ok(file && fs.existsSync(file), `Required real Cancel screenshot was not captured: ${name}`);
  const bytes = fs.readFileSync(file);
  assert.ok(
    bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'Required screenshot must be a real PNG'
  );
}
