import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { connectToVsCodeWorkbenchCdp, type CdpConnection } from './cdpClient';
import { clickPoint, type CdpEvaluator, type Point } from './cdpFormHelpers';

const remainingWorkbenchBudget = (deadline: number): number => {
  const remaining = deadline - Date.now();
  assert.ok(remaining > 0, 'Workbench action deadline exhausted');
  return remaining;
};

export function boundedCdp(cdp: CdpEvaluator, deadline: number): CdpEvaluator {
  return {
    evaluate: (context, expression) => cdp.evaluate(context, expression, { timeoutMs: Math.min(5000, remainingWorkbenchBudget(deadline)) }),
    send: (method, params) => cdp.send(method, params, { timeoutMs: Math.min(5000, remainingWorkbenchBudget(deadline)) }),
  };
}

export async function poll<T>(read: () => Promise<T>, accept: (value: T) => boolean, deadline: number): Promise<T> {
  while (remainingWorkbenchBudget(deadline)) {
    const value = await read();
    remainingWorkbenchBudget(deadline);
    if (accept(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(200, remainingWorkbenchBudget(deadline))));
  }
  throw new Error('Workbench observation did not satisfy its postcondition');
}

export const workbenchVisibleScript = `
  const visible = e => e instanceof HTMLElement && getComputedStyle(e).visibility !== 'hidden' &&
    getComputedStyle(e).display !== 'none' && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const text = e => (e.innerText || e.textContent || e.getAttribute('aria-label') || e.getAttribute('title') || '')
    .replace(/\\s+/g,' ').replace(/…/g,'...').trim();
  const normalized = value => value.toLowerCase();
  const point = e => { const r=e.getBoundingClientRect(); const p={x:r.left+r.width/2,y:r.top+r.height/2};
    const hit=document.elementFromPoint(p.x,p.y); return hit && (hit===e || e.contains(hit)) ? p : null; };
`;

export interface RegularWorkbenchOwnershipExpectation {
  workspaceFilePath: string;
  rootPaths: string[];
}

export interface RegularWorkbenchOwnershipState {
  timeOrigin: number;
  title: string;
  ready: boolean;
  roots: string[];
  shellOwned: boolean;
  owned: boolean;
}

export interface OwnedRegularWorkbench {
  cdp: CdpConnection;
  state: RegularWorkbenchOwnershipState;
}

function matchesRegularWorkbenchTitle(
  state: Pick<RegularWorkbenchOwnershipState, 'ready' | 'title'>,
  expectation: RegularWorkbenchOwnershipExpectation
): boolean {
  const workspaceTitle = path.basename(expectation.workspaceFilePath, path.extname(expectation.workspaceFilePath)).toLowerCase();
  const workspaceFileName = path.basename(expectation.workspaceFilePath).toLowerCase();
  const expectedSegments = new Set([
    workspaceTitle,
    workspaceFileName,
    `${workspaceTitle} (workspace)`,
    `${workspaceFileName} (workspace)`,
  ]);
  const titleSegments = state.title
    .split(' - ')
    .map((segment) =>
      segment
        .replace(/^[●*]\s*/, '')
        .replace(/^\[extension development host\]\s*/i, '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
  return state.ready && titleSegments.some((segment) => expectedSegments.has(segment));
}

export function matchesRegularWorkbenchShell(
  state: Pick<RegularWorkbenchOwnershipState, 'ready' | 'title'>,
  expectation: RegularWorkbenchOwnershipExpectation
): boolean {
  return matchesRegularWorkbenchTitle(state, expectation);
}

export function matchesRegularWorkbenchOwnership(
  state: Pick<RegularWorkbenchOwnershipState, 'ready' | 'title' | 'roots'>,
  expectation: RegularWorkbenchOwnershipExpectation
): boolean {
  const expectedRoots = expectation.rootPaths.map((root) => path.basename(root).toLowerCase()).sort();
  const actualRoots = state.roots.map((root) => root.toLowerCase()).sort();
  return (
    matchesRegularWorkbenchTitle(state, expectation) &&
    expectedRoots.length === actualRoots.length &&
    expectedRoots.every((root, index) => root === actualRoots[index])
  );
}

export async function readRegularWorkbenchOwnership(
  cdp: CdpEvaluator,
  expectation: RegularWorkbenchOwnershipExpectation
): Promise<RegularWorkbenchOwnershipState> {
  const state = await cdp.evaluate<Omit<RegularWorkbenchOwnershipState, 'shellOwned' | 'owned'>>(
    undefined,
    `(() => { ${workbenchVisibleScript}
      return {
        timeOrigin: performance.timeOrigin,
        title: document.title,
        ready: document.readyState === 'complete' && Array.from(document.querySelectorAll('.monaco-workbench')).some(visible),
        roots: (() => {
          const folderView = Array.from(document.querySelectorAll('.explorer-folders-view')).find(visible);
          if (!folderView) return [];
          const rows = Array.from(folderView.querySelectorAll('.monaco-list-row[aria-level="1"] .label-name')).filter(visible).map(text);
          if (rows.length > 0) return rows;
          const paneTitle = folderView.closest('.pane')?.querySelector('.pane-header .title');
          return paneTitle && visible(paneTitle) ? [text(paneTitle)] : [];
        })(),
      };
    })()`
  );
  return {
    ...state,
    shellOwned: matchesRegularWorkbenchShell(state, expectation),
    owned: matchesRegularWorkbenchOwnership(state, expectation),
  };
}

export async function waitForRegularWorkbenchShell(
  cdp: CdpEvaluator,
  expectation: RegularWorkbenchOwnershipExpectation,
  deadline: number
): Promise<RegularWorkbenchOwnershipState> {
  return poll(
    () => readRegularWorkbenchOwnership(cdp, expectation),
    (state) => state.shellOwned,
    deadline
  );
}

export async function waitForRegularWorkbenchOwnership(
  cdp: CdpEvaluator,
  expectation: RegularWorkbenchOwnershipExpectation,
  deadline: number
): Promise<RegularWorkbenchOwnershipState> {
  return poll(
    () => readRegularWorkbenchOwnership(cdp, expectation),
    (state) => state.owned,
    deadline
  );
}

export async function connectToOwnedRegularWorkbench(options: {
  expectation: RegularWorkbenchOwnershipExpectation;
  deadline: number;
  connectionTimeoutMs?: number;
  activate?: boolean;
  connect?: typeof connectToVsCodeWorkbenchCdp;
}): Promise<OwnedRegularWorkbench> {
  const connectionDeadline = Math.min(options.deadline, Date.now() + (options.connectionTimeoutMs ?? 15000));
  const cdp = await (options.connect ?? connectToVsCodeWorkbenchCdp)({
    activate: options.activate,
    waitForServer: true,
    timeoutMs: remainingWorkbenchBudget(connectionDeadline),
  });
  try {
    const client = boundedCdp(cdp, options.deadline);
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    const state = await waitForRegularWorkbenchShell(client, options.expectation, options.deadline);
    assert.ok(cdp.targetId, 'The invocation-owned regular Code window must expose one exact CDP target identity');
    return { cdp, state };
  } catch (error) {
    cdp.dispose();
    throw error;
  }
}

export async function ensureWorkbenchPanelClosed(options: {
  deadline: number;
  executeCommand: (commandId: string) => PromiseLike<unknown>;
  connect?: typeof connectToVsCodeWorkbenchCdp;
}): Promise<void> {
  const connectionDeadline = Math.min(options.deadline, Date.now() + 2000);
  const cdp = await (options.connect ?? connectToVsCodeWorkbenchCdp)({
    activate: false,
    waitForServer: true,
    timeoutMs: remainingWorkbenchBudget(connectionDeadline),
  });
  try {
    const client = boundedCdp(cdp, options.deadline);
    const panelVisible = () =>
      client.evaluate<boolean>(
        undefined,
        `(() => { ${workbenchVisibleScript}
          return Array.from(document.querySelectorAll('#workbench\\\\.parts\\\\.panel, .part.panel'))
            .some(e => {
              if (!visible(e) || e.getAttribute('aria-hidden') === 'true') return false;
              const rect = e.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 &&
                rect.right > 0 && rect.bottom > 0 &&
                rect.left < window.innerWidth && rect.top < window.innerHeight;
            });
        })()`
      );
    if (!(await panelVisible())) {
      return;
    }

    const timeoutMs = remainingWorkbenchBudget(options.deadline);
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        Promise.resolve(options.executeCommand('workbench.action.closePanel')),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Close workbench panel command deadline expired')), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
    await poll(panelVisible, (visible) => !visible, options.deadline);
  } finally {
    cdp.dispose();
  }
}

export async function ensureRegularWorkbenchExplorer(
  cdp: CdpEvaluator,
  expectation: RegularWorkbenchOwnershipExpectation,
  deadline: number
): Promise<RegularWorkbenchOwnershipState> {
  const initial = await readRegularWorkbenchOwnership(cdp, expectation);
  if (initial.owned) {
    return initial;
  }
  const explorerActivity = await cdp.evaluate<{ point: Point | null; active: boolean } | null>(
    undefined,
    `(() => { ${workbenchVisibleScript}
      const found = Array.from(document.querySelectorAll('.activitybar .action-label'))
        .filter(visible)
        .filter(e => normalized(text(e)).startsWith('explorer'))
        .filter(e => e.getAttribute('aria-disabled') !== 'true');
      if (found.length !== 1) return null;
      const item = found[0].closest('.action-item');
      return {
        point: point(found[0]),
        active: !!item && (
          item.classList.contains('checked') ||
          item.getAttribute('aria-checked') === 'true' ||
          item.getAttribute('aria-selected') === 'true'
        ),
      };
    })()`
  );
  if (explorerActivity?.active) {
    console.log('[workbench] Explorer activity is already active; waiting for its exact workspace roots');
  } else if (explorerActivity?.point) {
    await clickPoint(cdp, explorerActivity.point);
  } else {
    await command(cdp, 'View: Show Explorer', Math.min(deadline, Date.now() + 10_000));
  }
  try {
    const state = await waitForRegularWorkbenchOwnership(cdp, expectation, deadline);
    console.log(
      `[workbench] Explorer projection ready for ${path.basename(expectation.workspaceFilePath)} with roots=${JSON.stringify(state.roots)}`
    );
    return state;
  } catch (error) {
    throw new Error(
      `Explorer projection did not reach the exact workspace roots before its deadline: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function reloadOwnedRegularWorkbench(
  cdp: Pick<CdpConnection, 'evaluate' | 'send' | 'targetId' | 'contextGeneration'>,
  expectation: RegularWorkbenchOwnershipExpectation,
  deadline: number
): Promise<{
  before: RegularWorkbenchOwnershipState;
  after: RegularWorkbenchOwnershipState;
  targetId: string;
  beforeGeneration: number;
  afterGeneration: number;
}> {
  const client = boundedCdp(cdp, deadline);
  const before = await ensureRegularWorkbenchExplorer(client, expectation, deadline);
  assert.ok(before.owned, 'Reload must begin in the exact complete visible workspace');
  const targetId = cdp.targetId;
  assert.ok(targetId, 'Original Code window target identity is required');
  const beforeGeneration = cdp.contextGeneration;
  await command(client, 'Developer: Reload Window', deadline);
  const afterShell = await poll(
    async () => {
      try {
        return await readRegularWorkbenchOwnership(client, expectation);
      } catch (error) {
        if (
          error instanceof Error &&
          (/^Execution context was destroyed/.test(error.message) ||
            error.message === 'Cannot find context with specified id' ||
            error.message === 'Inspected target navigated or closed')
        ) {
          return undefined;
        }
        throw error;
      }
    },
    (state) => !!state?.shellOwned && state.timeOrigin !== before.timeOrigin,
    deadline
  );
  assert.ok(afterShell);
  const after = await ensureRegularWorkbenchExplorer(client, expectation, deadline);
  assert.equal(after.timeOrigin, afterShell.timeOrigin, 'Explorer projection must remain in the reloaded workbench document');
  assert.equal(cdp.targetId, targetId, 'Reload continuation must retain the original window target');
  assert.ok(cdp.contextGeneration > beforeGeneration, 'Reload requires a fresh CDP execution-context generation');
  return { before, after, targetId, beforeGeneration, afterGeneration: cdp.contextGeneration };
}

export async function clickText(
  cdp: CdpEvaluator,
  selector: string,
  label: string,
  deadline: number,
  context?: number,
  exact = true
): Promise<void> {
  const position = await poll(
    () =>
      cdp.evaluate<Point | null>(
        context,
        `(() => { ${workbenchVisibleScript}
          const found=Array.from(document.querySelectorAll(${JSON.stringify(selector)})).filter(visible)
            .filter(e => ${exact ? 'normalized(text(e))===' : 'normalized(text(e)).includes('}normalized(${JSON.stringify(label)})${exact ? '' : ')'} &&
              !e.disabled && e.getAttribute('aria-disabled')!=='true');
          return found.length===1 ? point(found[0]) : null;
        })()`
      ),
    (value) => value !== null,
    deadline
  );
  assert.ok(position, 'Exactly one visible enabled control is required');
  await clickPoint(cdp, position);
}

export async function dispatchContextMenu(cdp: CdpEvaluator, position: Point): Promise<void> {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...position });
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', {
      type,
      ...position,
      button: 'right',
      buttons: type === 'mousePressed' ? 2 : 0,
      clickCount: 1,
    });
  }
}

export interface ContextMenuState {
  menuCount: number;
  candidates: Array<{ text: string; enabled: boolean; hitTestable: boolean }>;
  point: Point | null;
  activeElement: { tag: string; role: string | null; className: string } | null;
  quickInputVisible: boolean;
}

export function readContextMenuState(cdp: CdpEvaluator, label: string): Promise<ContextMenuState> {
  return cdp.evaluate(
    undefined,
    `(() => { ${workbenchVisibleScript}
        const menus=Array.from(document.querySelectorAll('.context-view .monaco-menu')).filter(visible);
        const candidates=menus.flatMap(menu => Array.from(menu.querySelectorAll('.action-menu-item')))
          .filter(visible)
          .map(e => ({
            element: e,
            text: text(e.querySelector('.action-label') || e),
            // Monaco puts disabled state on the item/container, NOT its label span.
            enabled: !e.disabled && !e.closest('[aria-disabled="true"], .disabled'),
            point: point(e),
          }));
        const matches=candidates.filter(entry => normalized(entry.text)===normalized(${JSON.stringify(label.replace(/…/g, '...'))}) && entry.enabled && entry.point);
        const active=document.activeElement;
        return {
          menuCount: menus.length,
          candidates: candidates.map(entry => ({text:entry.text,enabled:entry.enabled,hitTestable:!!entry.point})),
          point: matches.length===1 ? matches[0].point : null,
          activeElement: active ? {tag:active.tagName,role:active.getAttribute('role'),className:active.className} : null,
          quickInputVisible: Array.from(document.querySelectorAll('.quick-input-widget input')).some(visible),
        };
      })()`
  );
}

export async function clickContextMenuText(cdp: CdpEvaluator, label: string, deadline: number): Promise<void> {
  let lastState: ContextMenuState | undefined;
  while (Date.now() < deadline) {
    lastState = await readContextMenuState(cdp, label);
    if (lastState.point) {
      await clickPoint(cdp, lastState.point);
      // A moved highlight is not activation. Do not replay the click or replace
      // it with a command invocation when the menu remains open.
      try {
        await poll(
          () => readContextMenuState(cdp, label),
          (state) => state.menuCount === 0,
          deadline
        );
      } catch (error) {
        throw new Error(`Context menu action ${JSON.stringify(label)} did not close its menu after the UI click`, { cause: error });
      }
      return;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(200, remaining)));
  }
  assert.fail(
    `Context menu action ${JSON.stringify(label)} was not uniquely visible, enabled, and hit-testable. State=${JSON.stringify(lastState)}`
  );
}

export async function command(cdp: CdpEvaluator, title: string, deadline: number): Promise<void> {
  for (const type of ['keyDown', 'keyUp']) {
    await cdp.send('Input.dispatchKeyEvent', { type, key: 'P', code: 'KeyP', modifiers: 10, windowsVirtualKeyCode: 80 });
  }
  await poll(
    () =>
      cdp.evaluate<boolean>(
        undefined,
        `(() => { ${workbenchVisibleScript} return Array.from(document.querySelectorAll('.quick-input-widget input')).some(visible); })()`
      ),
    Boolean,
    deadline
  );
  await cdp.send('Input.insertText', { text: title });
  await clickText(cdp, '.quick-input-list .monaco-list-row .label-name', title, deadline);
}
