import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CdpConnection } from './cdpClient';
import type { Point } from './cdpFormHelpers';
import { clickPoint, pressKey } from './cdpFormHelpers';
import { getWebviewTabs } from './webviewTabs';
import { boundedCdp, clickText, poll } from './workbenchCdpActions';

const visibleWorkbenchElement = `
  const visible = element => element instanceof HTMLElement &&
    getComputedStyle(element).visibility !== 'hidden' &&
    getComputedStyle(element).display !== 'none' &&
    !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  const text = element => (element.innerText || element.textContent || element.getAttribute('aria-label') || '')
    .replace(/\\s+/g, ' ').trim();
  const point = element => {
    const rect = element.getBoundingClientRect();
    const result = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const hit = document.elementFromPoint(result.x, result.y);
    return hit && (hit === element || element.contains(hit)) ? result : null;
  };
`;

const normalizedPhysicalPath = (value: string): string => {
  const resolved = fs.realpathSync.native(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

const isExactPath = (actual: string | undefined, expected: string): boolean =>
  typeof actual === 'string' && normalizedPhysicalPath(actual) === normalizedPhysicalPath(expected);

const nativeStepDeadline = (deadline: number, timeoutMs: number, description: string): number => {
  const bounded = Math.min(deadline, Date.now() + timeoutMs);
  assert.ok(bounded > Date.now(), `${description} cannot start after the scenario deadline`);
  console.log(`[http-timeout-compose][native-editor] ${description}`);
  return bounded;
};

const pollNativeStep = async <T>(
  operation: () => Promise<T>,
  accept: (value: T) => boolean,
  deadline: number,
  description: string
): Promise<T> => {
  try {
    return await poll(operation, accept, deadline);
  } catch (error) {
    throw new Error(`${description} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const runNativeStep = async <T>(operation: () => PromiseLike<T>, deadline: number, timeoutMs: number, description: string): Promise<T> => {
  const stepDeadline = nativeStepDeadline(deadline, timeoutMs, description);
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation()),
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${description} deadline exhausted`)), stepDeadline - Date.now());
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const textEditorTabForPath = (filePath: string): vscode.Tab | undefined =>
  vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .find((tab) => tab.input instanceof vscode.TabInputText && isExactPath(tab.input.uri.fsPath, filePath));

const assertActiveTextEditor = (filePath: string): vscode.TextEditor => {
  const editor = vscode.window.activeTextEditor;
  assert.ok(editor && isExactPath(editor.document.uri.fsPath, filePath), `Active text editor is not ${filePath}`);
  assert.ok(textEditorTabForPath(filePath)?.isActive, `Exact workflow text tab is not active: ${filePath}`);
  return editor;
};

async function selectedExplorerFilePoint(
  connection: Pick<CdpConnection, 'evaluate' | 'send'>,
  filePath: string,
  deadline: number
): Promise<Point> {
  await runNativeStep(() => vscode.commands.executeCommand('workbench.view.explorer'), deadline, 15_000, 'showing the Explorer view');
  await runNativeStep(
    () => vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(filePath)),
    deadline,
    15_000,
    `revealing the exact Explorer file ${filePath}`
  );
  const selectionDeadline = nativeStepDeadline(deadline, 15_000, `selecting the exact Explorer row for ${filePath}`);
  const cdp = boundedCdp(connection, selectionDeadline);
  const fileName = path.basename(filePath);
  const position = await pollNativeStep(
    () =>
      cdp.evaluate<Point | null>(
        undefined,
        `(() => { ${visibleWorkbenchElement}
          const rows = Array.from(document.querySelectorAll(
            '.explorer-viewlet .monaco-list-row, .explorer-folders-view .monaco-list-row'
          )).filter(visible).filter(row => {
            const classes = row.className || '';
            return text(row).includes(${JSON.stringify(fileName)}) &&
              (classes.includes('selected') || classes.includes('focused'));
          });
          return rows.length === 1 ? point(rows[0]) : null;
        })()`
      ),
    (value) => value !== null,
    selectionDeadline,
    `selecting the exact Explorer row for ${filePath}`
  );
  assert.ok(position, `Exact selected Explorer row was not found for ${filePath}`);
  return position;
}

export async function closeActiveDesignerTab(designerViewType: string, deadline: number): Promise<void> {
  const stepDeadline = nativeStepDeadline(deadline, 15_000, 'closing the exact active Designer tab');
  const tabs = getWebviewTabs(designerViewType);
  assert.strictEqual(tabs.length, 1, 'Exactly one designer tab must be open before closing it');
  assert.strictEqual(tabs[0].isActive, true, 'The designer tab must be active before closing it');
  assert.strictEqual(await vscode.window.tabGroups.close(tabs[0]), true, 'The exact active designer tab must close');
  await pollNativeStep(
    async () => getWebviewTabs(designerViewType).length,
    (count) => count === 0,
    stepDeadline,
    'closing the exact active Designer tab'
  );
}

export async function openExactExplorerFileInNativeEditor(
  connection: Pick<CdpConnection, 'evaluate' | 'send'>,
  filePath: string,
  deadline: number
): Promise<string> {
  const position = await selectedExplorerFilePoint(connection, filePath, deadline);
  const clickDeadline = nativeStepDeadline(deadline, 10_000, 'clicking the exact selected workflow.json Explorer row once');
  await clickPoint(boundedCdp(connection, clickDeadline), position);
  const editorDeadline = nativeStepDeadline(deadline, 15_000, 'opening the exact selected workflow.json in the native editor');
  const editor = await pollNativeStep(
    async () => {
      const active = vscode.window.activeTextEditor;
      return active && isExactPath(active.document.uri.fsPath, filePath) && textEditorTabForPath(filePath)?.isActive ? active : undefined;
    },
    (value) => value !== undefined,
    editorDeadline,
    `opening the exact native editor for ${filePath}`
  );
  assert.ok(editor);
  return editor.document.getText();
}

export async function replaceActiveNativeEditorText(
  connection: Pick<CdpConnection, 'evaluate' | 'send'>,
  filePath: string,
  replacement: string,
  deadline: number
): Promise<void> {
  assertActiveTextEditor(filePath);
  const editorDeadline = nativeStepDeadline(deadline, 15_000, 'locating the visible native workflow.json Monaco editor');
  const editorCdp = boundedCdp(connection, editorDeadline);
  const position = await pollNativeStep(
    () =>
      editorCdp.evaluate<Point | null>(
        undefined,
        `(() => { ${visibleWorkbenchElement}
          const editors = Array.from(document.querySelectorAll('.editor-group-container.active .monaco-editor')).filter(visible);
          const target = editors.length === 1 ? editors[0].querySelector('.view-lines') || editors[0] : null;
          return target ? point(target) : null;
        })()`
      ),
    (value) => value !== null,
    editorDeadline,
    `locating the visible native Monaco editor for ${filePath}`
  );
  assert.ok(position, 'Active native Monaco editor was not visible');
  const inputDeadline = nativeStepDeadline(deadline, 15_000, 'replacing the active native workflow.json editor contents');
  const inputCdp = boundedCdp(connection, inputDeadline);
  await clickPoint(inputCdp, position);
  await pressKey(inputCdp, 'KeyA', 'a', 65, 2);
  await inputCdp.send('Input.insertText', { text: replacement });
  const replacementDeadline = nativeStepDeadline(deadline, 15_000, 'observing the replaced native workflow.json contents');
  await pollNativeStep(
    async () => {
      const editor = assertActiveTextEditor(filePath);
      return editor.document.isDirty && editor.document.getText() === replacement;
    },
    Boolean,
    replacementDeadline,
    `replacing the native editor contents for ${filePath}`
  );
}

export async function saveAndCloseActiveNativeEditor(
  connection: Pick<CdpConnection, 'evaluate' | 'send'>,
  filePath: string,
  expected: unknown,
  deadline: number
): Promise<void> {
  assertActiveTextEditor(filePath);
  const saveDeadline = nativeStepDeadline(deadline, 10_000, 'saving the active native workflow.json editor');
  await pressKey(boundedCdp(connection, saveDeadline), 'KeyS', 's', 83, 2);
  const persistenceDeadline = nativeStepDeadline(deadline, 20_000, 'observing the persisted native workflow.json contents');
  await pollNativeStep(
    async () => {
      const editor = assertActiveTextEditor(filePath);
      if (editor.document.isDirty) {
        return false;
      }
      try {
        return JSON.stringify(JSON.parse(fs.readFileSync(filePath, 'utf8'))) === JSON.stringify(expected);
      } catch {
        return false;
      }
    },
    Boolean,
    persistenceDeadline,
    `persisting the native editor contents for ${filePath}`
  );
  const closeDeadline = nativeStepDeadline(deadline, 10_000, 'closing the active native workflow.json editor');
  await pressKey(boundedCdp(connection, closeDeadline), 'KeyW', 'w', 87, 2);
  const closedDeadline = nativeStepDeadline(deadline, 10_000, 'observing the closed native workflow.json editor');
  await pollNativeStep(
    async () => {
      const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      return !isExactPath(activePath, filePath) && !textEditorTabForPath(filePath);
    },
    Boolean,
    closedDeadline,
    `closing the exact native editor tab for ${filePath}`
  );
}

export async function openDesignerFromExactExplorerFile(
  connection: Pick<CdpConnection, 'evaluate' | 'send'>,
  filePath: string,
  workflowName: string,
  designerViewType: string,
  deadline: number,
  beforePoll?: () => void | Promise<void>
): Promise<vscode.Tab> {
  assert.strictEqual(getWebviewTabs(designerViewType).length, 0, 'Stale designer tab exists before native reopen');
  const position = await selectedExplorerFilePoint(connection, filePath, deadline);
  const contextMenuDeadline = nativeStepDeadline(deadline, 10_000, 'opening the exact workflow.json Explorer context menu');
  const contextMenuCdp = boundedCdp(connection, contextMenuDeadline);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await contextMenuCdp.send('Input.dispatchMouseEvent', {
      type,
      ...position,
      button: 'right',
      buttons: type === 'mousePressed' ? 2 : 0,
      clickCount: 1,
    });
  }
  const openDesignerDeadline = nativeStepDeadline(deadline, 20_000, 'selecting Open Designer for the exact workflow.json');
  await clickText(boundedCdp(connection, openDesignerDeadline), '.monaco-menu .action-label', 'Open Designer', openDesignerDeadline);
  const designerDeadline = nativeStepDeadline(deadline, 180_000, 'observing the fresh Designer tab');
  const tab = await pollNativeStep(
    async () => {
      await beforePoll?.();
      const tabs = getWebviewTabs(designerViewType);
      return tabs.length === 1 && tabs[0].isActive && tabs[0].label.includes(workflowName) ? tabs[0] : undefined;
    },
    (value) => value !== undefined,
    designerDeadline,
    `opening the fresh Designer tab for ${workflowName}`
  );
  assert.ok(tab);
  return tab;
}
