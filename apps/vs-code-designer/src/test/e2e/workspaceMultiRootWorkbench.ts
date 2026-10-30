import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { connectToVsCodeCdpByText } from './cdpClient';
import { type CdpEvaluator, type Point, clickPoint, pressKey } from './cdpFormHelpers';
import { remainingBudget } from './workspaceMultiRootCollector';
import type { MultiRootBootstrapAttestation } from './workspaceMultiRootBootstrap';
import { assertFuncRuntimeResolution, type FuncRuntimeResolution } from './workspaceMultiRootLaunch';
import { normalizeFsPath } from './testUtils';
import { clickContextMenuText, command, poll, readContextMenuState, workbenchVisibleScript as visibleScript } from './workbenchCdpActions';

export { boundedCdp, clickText, command, poll } from './workbenchCdpActions';

export interface WorkbenchState {
  timeOrigin: number;
  title: string;
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
        title:document.title,
        ready:document.readyState==='complete' && Array.from(document.querySelectorAll('.monaco-workbench')).some(visible),
        roots:Array.from(document.querySelectorAll('.explorer-folders-view .monaco-list-row[aria-level="1"] .label-name')).filter(visible).map(text),
        activeTabs:Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]')).filter(visible).map(text),
        visibleWebviews:Array.from(document.querySelectorAll('iframe')).filter(visible).map(e=>e.src),
        debugToolbar:Array.from(document.querySelectorAll('.debug-toolbar')).some(visible)};
    })()`
  );
}

export type FolderMenuCheckpoint = 'root-selected' | 'menu-open' | 'menu-invoked' | 'menu-failure';

export async function folderCreateNewProject(
  cdp: CdpEvaluator,
  folder: string,
  deadline: number,
  options: { workspaceFilePath: string; checkpoint: (stage: FolderMenuCheckpoint) => Promise<void> }
): Promise<void> {
  // Bind presentation to the persisted physical root, including workspace name
  // overrides. A basename match alone must not select a different root.
  const workspace: { folders: Array<{ path: string; name?: string }> } = JSON.parse(fs.readFileSync(options.workspaceFilePath, 'utf8'));
  const roots = workspace.folders.map((root) => ({
    physical: normalizePhysicalPath(path.resolve(path.dirname(options.workspaceFilePath), root.path)),
    label: root.name ?? path.basename(path.resolve(path.dirname(options.workspaceFilePath), root.path)),
  }));
  const matches = roots.filter((root) => root.physical === normalizePhysicalPath(folder));
  assert.equal(matches.length, 1, 'Create Project requires one exact persisted physical workspace root');
  assert.equal(
    new Set(roots.map((root) => root.label)).size,
    roots.length,
    'Ambiguous Explorer root labels cannot identify the exact folder'
  );
  const label = matches[0].label;
  const expectedLabels = roots.map((root) => root.label).sort();
  const rootState = () =>
    cdp.evaluate<{ point: Point | null; selected: boolean; focused: boolean; roots: string[] }>(
      undefined,
      `(() => { ${visibleScript}
        const rows=Array.from(document.querySelectorAll('.explorer-folders-view .monaco-list-row[aria-level="1"]')).filter(visible);
        const roots=rows.map(e=>text(e.querySelector('.label-name') || e));
        const matches=rows.filter(e=>text(e.querySelector('.label-name') || e)===${JSON.stringify(label)});
        const row=matches.length===1 ? matches[0] : null;
        const list=row?.closest('.monaco-list');
        const focused=!!row && (row.contains(document.activeElement) ||
          (!!list && list.contains(document.activeElement) && list.getAttribute('aria-activedescendant')===row.id));
        return {roots, point:row ? point(row.querySelector('.label-name') || row) : null,
          selected:!!row && row.getAttribute('aria-selected')==='true', focused};
      })()`
    );
  const exactRoots = (actual: string[]) =>
    actual.length === expectedLabels.length && [...actual].sort().every((value, index) => value === expectedLabels[index]);
  try {
    await command(cdp, 'View: Show Explorer', deadline);
    const state = await poll(rootState, (value) => !!value.point && exactRoots(value.roots), deadline);
    assert.ok(state.point);
    await clickPoint(cdp, state.point);
    await poll(rootState, (value) => value.selected && value.focused && exactRoots(value.roots), deadline);
    await options.checkpoint('root-selected');
    await poll(rootState, (value) => value.selected && value.focused && exactRoots(value.roots), deadline);
    // Monaco List handles ContextMenu on keyup using its focused element as
    // the anchor. This is native UI input, not a command-service substitute.
    await pressKey(cdp, 'ContextMenu', 'ContextMenu', 93);
    await poll(
      () => readContextMenuState(cdp, 'Create new project...'),
      (value) => value.menuCount > 0,
      Math.min(deadline, Date.now() + 10000)
    );
    await options.checkpoint('menu-open');
    await clickContextMenuText(cdp, 'Create new project...', deadline);
    await options.checkpoint('menu-invoked');
  } catch (error) {
    // Keep diagnostics best-effort and never replace the original body failure.
    try {
      console.error(
        `[multi-root-folder-menu] ${JSON.stringify({ folder, label, root: await rootState(), menu: await readContextMenuState(cdp, 'Create new project...') })}`
      );
    } catch (diagnosticError) {
      console.error(`[multi-root-folder-menu] DOM diagnostic failed: ${String(diagnosticError)}`);
    }
    try {
      await options.checkpoint('menu-failure');
    } catch (diagnosticError) {
      console.error(`[multi-root-folder-menu] Screenshot diagnostic failed: ${String(diagnosticError)}`);
    }
    throw error;
  }
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

const normalizePhysicalPath = (value: string): string => normalizeFsPath(fs.realpathSync.native(value));

export function readLogicAppRoots(workspaceFile: string, expected: string[]): string[] {
  const workspace: { folders: { path: string }[] } = JSON.parse(fs.readFileSync(workspaceFile, 'utf8'));
  assert.ok(Array.isArray(workspace.folders) && workspace.folders.length >= 2, 'Generated multi-root workspace is incomplete');
  const folders = workspace.folders.map((folder) => {
    assert.ok(typeof folder.path === 'string', 'Non-filesystem workspace folder is not admitted');
    return fs.realpathSync.native(path.resolve(path.dirname(workspaceFile), folder.path));
  });
  assert.equal(new Set(folders.map(normalizePhysicalPath)).size, folders.length, 'Duplicate generated workspace root');
  const expectedPhysical = expected.map(normalizePhysicalPath);
  const roots = folders.filter((folder) => {
    const host = fs.existsSync(path.join(folder, 'host.json'));
    const settings = fs.existsSync(path.join(folder, 'local.settings.json'));
    assert.equal(host, settings, 'Incomplete Logic App root; population denominator cannot be trusted');
    if (!host) {
      assert.ok(!expectedPhysical.includes(normalizePhysicalPath(folder)), 'Required Logic App root has no generated host/settings');
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
    expectedPhysical.every((folder) => roots.map(normalizePhysicalPath).includes(folder)),
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

export async function waitForActivatedMultiRootRuntime(
  readEvents: () => DebugEvent[],
  boot: string,
  bootstrap: MultiRootBootstrapAttestation,
  deadline: number
): Promise<DebugEvent> {
  // The recorder's activation event only proves that the recorder started.
  // Its runtimeResolution event is emitted AFTER awaiting product activation,
  // including updateLogicAppsContext which enables Explorer contributions.
  const runtime = await poll(
    async () => readEvents().find((event) => event.kind === 'runtimeResolution' && event.boot === boot),
    Boolean,
    deadline
  );
  assert.ok(runtime && !runtime.error, `Actual activation/runtime resolution failed: ${runtime?.error || 'missing observation'}`);
  assertFuncRuntimeResolution(runtime.resolution, bootstrap);
  return runtime;
}

export function debugEvents(file: string): DebugEvent[] {
  return fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DebugEvent);
}

export function assertSequentialDebug(events: DebugEvent[], expectedRoots: string[], platform: NodeJS.Platform = process.platform): void {
  const normalizeDebugPath = (value: string): string => normalizeFsPath(value, platform);
  const normalizedExpectedRoots = expectedRoots.map(normalizeDebugPath);
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
    const eventFolder = normalizeDebugPath(event.folder);
    if (event.kind === 'started') {
      assert.equal(active.size, 0, 'Logic App debuggers must run one at a time');
      assert.ok(normalizedExpectedRoots.includes(eventFolder), 'Wrong-folder debugger launched');
      assert.ok(!completed.includes(eventFolder), 'Duplicate folder debug launch');
      assert.ok(!startedSessions.has(event.id), 'Reused native debug session ID');
      debugBoot ??= event.boot;
      assert.equal(event.boot, debugBoot, 'Sequential debug must remain in the real reloaded extension host');
      active.add(event.id);
      startedFolders.set(event.id, eventFolder);
      startedSessions.set(event.id, event);
    } else {
      assert.equal(event.kind, 'terminated', 'Unknown debug evidence event');
      assert.ok(active.delete(event.id), 'Unmatched native debug termination');
      assert.equal(startedFolders.get(event.id), eventFolder, 'Terminated debugger belongs to a different folder');
      assert.equal(startedSessions.get(event.id)?.boot, event.boot, 'Termination came from a different extension host');
      assert.equal(startedSessions.get(event.id)?.name, event.name, 'Termination changed native debug configuration');
      assert.equal(startedSessions.get(event.id)?.type, event.type, 'Termination changed native debug type');
      completed.push(eventFolder);
    }
  }
  assert.equal(active.size, 0, 'Debugger remained active at finalization');
  assert.deepEqual(completed, normalizedExpectedRoots, 'Every folder must launch and terminate sequentially');
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
