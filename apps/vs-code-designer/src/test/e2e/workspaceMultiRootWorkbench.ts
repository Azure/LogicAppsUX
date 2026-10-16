import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { connectToVsCodeCdpByText, type CdpConnection } from './cdpClient';
import { type CdpEvaluator, type Point, pressKey } from './cdpFormHelpers';
import { remainingBudget } from './workspaceMultiRootCollector';
import type { FuncRuntimeResolution } from './workspaceMultiRootLaunch';
import { boundedCdp, clickText, command, poll, workbenchVisibleScript as visibleScript } from './workbenchCdpActions';

export { boundedCdp, clickText, command, poll } from './workbenchCdpActions';

export interface WorkbenchState {
  timeOrigin: number;
  ready: boolean;
  roots: string[];
  activeTabs: string[];
  visibleWebviews: string[];
  debugToolbar: boolean;
}

export function readWorkbench(cdp: CdpEvaluator): Promise<WorkbenchState> {
  return cdp.evaluate(
    undefined,
    `(() => { ${visibleScript}
      return {timeOrigin:performance.timeOrigin,
        ready:document.readyState==='complete' && Array.from(document.querySelectorAll('.monaco-workbench')).some(visible),
        roots:Array.from(document.querySelectorAll('.explorer-folders-view .monaco-list-row[aria-level="1"] .label-name')).filter(visible).map(text),
        activeTabs:Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]')).filter(visible).map(text),
        visibleWebviews:Array.from(document.querySelectorAll('iframe')).filter(visible).map(e=>e.src),
        debugToolbar:Array.from(document.querySelectorAll('.debug-toolbar')).some(visible)};
    })()`
  );
}

export function assertReload(before: WorkbenchState, after: WorkbenchState, roots: string[]): void {
  assert.ok(after.ready && after.timeOrigin !== before.timeOrigin, 'Real Reload Window must replace the workbench document');
  assert.ok(
    roots.every((root) => after.roots.includes(path.basename(root))),
    'Reload lost a required Explorer root'
  );
}

export async function realReload(
  cdp: Pick<CdpConnection, 'evaluate' | 'send' | 'targetId' | 'contextGeneration'>,
  roots: string[],
  deadline: number
): Promise<{ before: WorkbenchState; after: WorkbenchState; targetId: string; beforeGeneration: number; afterGeneration: number }> {
  const client = boundedCdp(cdp, deadline);
  await command(client, 'View: Show Explorer', deadline);
  const before = await readWorkbench(client);
  const target = cdp.targetId;
  assert.ok(target, 'Original Code window target identity is required');
  const generation = cdp.contextGeneration;
  await command(client, 'Developer: Reload Window', deadline); // Exactly one real user command, never replayed.
  const after = await poll(
    async () => {
      try {
        return await readWorkbench(client);
      } catch (error) {
        if (
          error instanceof Error &&
          (/^Execution context was destroyed/.test(error.message) ||
            error.message === 'Cannot find context with specified id' ||
            error.message === 'Inspected target navigated or closed')
        ) {
          return undefined;
        }
        throw error; // Closed CDP connection, permissions and unrelated RPC failures stay failures.
      }
    },
    (state) => !!state?.ready && state.timeOrigin !== before.timeOrigin && roots.every((root) => state.roots.includes(path.basename(root))),
    deadline
  );
  assert.ok(after);
  assertReload(before, after, roots);
  assert.equal(cdp.targetId, target, 'Reload continuation must retain the original window target');
  assert.ok(cdp.contextGeneration > generation, 'Reload requires a fresh CDP execution-context generation');
  return { before, after, targetId: target, beforeGeneration: generation, afterGeneration: cdp.contextGeneration };
}

export async function folderCreateNewProject(cdp: CdpEvaluator, folder: string, deadline: number): Promise<void> {
  await command(cdp, 'View: Show Explorer', deadline);
  const position = await poll(
    () =>
      cdp.evaluate<Point | null>(
        undefined,
        `(() => { ${visibleScript}
          const rows=Array.from(document.querySelectorAll('.explorer-folders-view .monaco-list-row[aria-level="1"]'))
            .filter(visible).filter(e=>text(e.querySelector('.label-name') || e)===${JSON.stringify(path.basename(folder))});
          return rows.length===1 ? point(rows[0]) : null; })()`
      ),
    (value) => value !== null,
    deadline
  );
  assert.ok(position);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', {
      type,
      ...position,
      button: 'right',
      buttons: type === 'mousePressed' ? 2 : 0,
      clickCount: 1,
    });
  }
  await clickText(cdp, '.monaco-menu .action-label', 'Create new project...', deadline);
}

export function assertActiveWebview(state: WorkbenchState, targetUrl: string | undefined, tab: string): void {
  assert.ok(
    state.activeTabs.some((label) => label === tab || label.startsWith(`${tab} `)),
    'Expected active editor, not a discovery command'
  );
  assert.ok(targetUrl, 'Webview owner target is required');
  const owner = new URL(targetUrl).hostname;
  assert.ok(
    state.visibleWebviews.some((url) => new URL(url).hostname === owner),
    'The selected webview must belong to a visible active iframe'
  );
}

export async function activeWebview(
  workbench: CdpEvaluator,
  tab: string,
  texts: string[],
  deadline: number,
  beforePoll?: () => void | Promise<void>
) {
  const result = await connectToVsCodeCdpByText({
    targetName: tab,
    allTextIncludes: texts,
    timeoutMs: remainingBudget(deadline),
    beforePoll,
    acceptCandidate: async (cdp) => assertActiveWebview(await readWorkbench(workbench), cdp.targetUrl, tab),
  });
  return result;
}

export function readLogicAppRoots(workspaceFile: string, expected: string[]): string[] {
  const workspace: { folders: { path: string }[] } = JSON.parse(fs.readFileSync(workspaceFile, 'utf8'));
  assert.ok(Array.isArray(workspace.folders) && workspace.folders.length >= 2, 'Generated multi-root workspace is incomplete');
  const folders = workspace.folders.map((folder) => {
    assert.ok(typeof folder.path === 'string', 'Non-filesystem workspace folder is not admitted');
    return fs.realpathSync(path.resolve(path.dirname(workspaceFile), folder.path));
  });
  assert.equal(new Set(folders).size, folders.length, 'Duplicate generated workspace root');
  const roots = folders.filter((folder) => {
    const host = fs.existsSync(path.join(folder, 'host.json'));
    const settings = fs.existsSync(path.join(folder, 'local.settings.json'));
    assert.equal(host, settings, 'Incomplete Logic App root; population denominator cannot be trusted');
    if (!host) {
      assert.ok(!expected.includes(folder), 'Required Logic App root has no generated host/settings');
      return false; // e.g. wizard-created Artifacts, not a Logic App.
    }
    JSON.parse(fs.readFileSync(path.join(folder, 'host.json'), 'utf8'));
    JSON.parse(fs.readFileSync(path.join(folder, 'local.settings.json'), 'utf8'));
    assert.ok(
      fs.readdirSync(folder).some((child) => fs.existsSync(path.join(folder, child, 'workflow.json'))),
      'Logic App root lacks its wizard-created workflow'
    );
    return true;
  });
  assert.ok(
    expected.every((folder) => roots.includes(fs.realpathSync(folder))),
    'Workspace is missing a created Logic App root'
  );
  assert.ok(roots.length >= 2, 'Multiple Logic Apps are required');
  return roots;
}

export interface DebugEvent {
  kind: 'activation' | 'runtimeResolution' | 'started' | 'terminated';
  boot: string;
  roots?: string[];
  id?: string;
  name?: string;
  folder?: string;
  type?: string;
  resolution?: FuncRuntimeResolution;
  error?: string;
}

export function debugEvents(file: string): DebugEvent[] {
  return fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DebugEvent);
}

export function assertSequentialDebug(events: DebugEvent[], expectedRoots: string[]): void {
  const active = new Set<string>();
  const startedFolders = new Map<string, string>();
  const startedSessions = new Map<string, DebugEvent>();
  let debugBoot: string | undefined;
  const completed: string[] = [];
  for (const event of events) {
    if (event.kind === 'runtimeResolution') {
      assert.ok(event.resolution && !event.error, 'Actual runtime resolution observation failed');
      continue;
    }
    if (event.kind === 'activation') {
      assert.equal(active.size, 0, 'Extension-host replacement during debugging invalidates the observation');
      if (debugBoot) {
        assert.equal(event.boot, debugBoot, 'Extension host replaced between sequential debug sessions');
      }
      continue;
    }
    assert.ok(event.id && event.folder && event.name && event.type, 'Missing folder-qualified native debug evidence');
    if (event.kind === 'started') {
      assert.equal(active.size, 0, 'Logic App debuggers must run one at a time');
      assert.ok(expectedRoots.includes(event.folder), 'Wrong-folder debugger launched');
      assert.ok(!completed.includes(event.folder), 'Duplicate folder debug launch');
      assert.ok(!startedSessions.has(event.id), 'Reused native debug session ID');
      debugBoot ??= event.boot;
      assert.equal(event.boot, debugBoot, 'Sequential debug must remain in the real reloaded extension host');
      active.add(event.id);
      startedFolders.set(event.id, event.folder);
      startedSessions.set(event.id, event);
    } else {
      assert.equal(event.kind, 'terminated', 'Unknown debug evidence event');
      assert.ok(active.delete(event.id), 'Unmatched native debug termination');
      assert.equal(startedFolders.get(event.id), event.folder, 'Terminated debugger belongs to a different folder');
      assert.equal(startedSessions.get(event.id)?.boot, event.boot, 'Termination came from a different extension host');
      assert.equal(startedSessions.get(event.id)?.name, event.name, 'Termination changed native debug configuration');
      assert.equal(startedSessions.get(event.id)?.type, event.type, 'Termination changed native debug type');
      completed.push(event.folder);
    }
  }
  assert.equal(active.size, 0, 'Debugger remained active at finalization');
  assert.deepEqual(completed, expectedRoots, 'Every folder must launch and terminate sequentially');
}

export function assertMapper(text: string, loaded: boolean): void {
  assert.ok(
    loaded && /\bSource schema\b/i.test(text) && /\bTarget schema\b/i.test(text),
    'Actual Data Mapper source/target UI did not load'
  );
  assert.ok(!/failed to|unable to|error loading|ENOENT/i.test(text), 'Data Mapper failed to load required assets/runtime');
}

export async function enterQuickInput(cdp: CdpEvaluator, value: string, deadline: number): Promise<void> {
  await poll(
    () =>
      cdp.evaluate<boolean>(
        undefined,
        `(() => { ${visibleScript} return Array.from(document.querySelectorAll('.quick-input-widget input')).some(visible); })()`
      ),
    Boolean,
    deadline
  );
  await cdp.send('Input.insertText', { text: value });
  await pressKey(cdp, 'Enter', 'Enter', 13);
}
