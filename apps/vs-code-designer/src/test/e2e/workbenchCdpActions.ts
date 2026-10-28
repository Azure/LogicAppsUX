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
  const titlePrefix = state.title
    .split(' - ')[0]
    .replace(/^[●*]\s*/, '')
    .trim()
    .toLowerCase();
  return state.ready && (titlePrefix === workspaceTitle || titlePrefix === workspaceFileName);
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
  const state = await cdp.evaluate<Omit<RegularWorkbenchOwnershipState, 'owned'>>(
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
  return { ...state, owned: matchesRegularWorkbenchOwnership(state, expectation) };
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
}): Promise<OwnedRegularWorkbench> {
  const connectionDeadline = Math.min(options.deadline, Date.now() + (options.connectionTimeoutMs ?? 15000));
  const cdp = await connectToVsCodeWorkbenchCdp({
    activate: options.activate,
    waitForServer: true,
    timeoutMs: remainingWorkbenchBudget(connectionDeadline),
  });
  try {
    const client = boundedCdp(cdp, connectionDeadline);
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await poll(
      async () => {
        const state = await readRegularWorkbenchOwnership(client, options.expectation);
        return { ...state, owned: matchesRegularWorkbenchTitle(state, options.expectation) };
      },
      (state) => state.owned,
      connectionDeadline
    );
    await command(client, 'View: Show Explorer', connectionDeadline);
    const state = await waitForRegularWorkbenchOwnership(client, options.expectation, connectionDeadline);
    assert.ok(cdp.targetId, 'The invocation-owned regular Code window must expose one exact CDP target identity');
    return { cdp, state };
  } catch (error) {
    cdp.dispose();
    throw error;
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
  await command(client, 'View: Show Explorer', deadline);
  const before = await readRegularWorkbenchOwnership(client, expectation);
  assert.ok(before.owned, 'Reload must begin in the exact complete visible workspace');
  const targetId = cdp.targetId;
  assert.ok(targetId, 'Original Code window target identity is required');
  const beforeGeneration = cdp.contextGeneration;
  await command(client, 'Developer: Reload Window', deadline);
  const after = await poll(
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
    (state) => !!state?.owned && state.timeOrigin !== before.timeOrigin,
    deadline
  );
  assert.ok(after);
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
