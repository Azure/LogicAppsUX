import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CdpEvaluator, Point } from './cdpFormHelpers';
import { clickPoint, pressKey } from './cdpFormHelpers';
import { getWebviewTabs } from './webviewTabs';
import { clickText, command, poll } from './workbenchCdpActions';

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

async function selectedExplorerFilePoint(cdp: CdpEvaluator, filePath: string, deadline: number): Promise<Point> {
  await command(cdp, 'View: Show Explorer', deadline);
  await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(filePath));
  const fileName = path.basename(filePath);
  const position = await poll(
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
    deadline
  );
  assert.ok(position, `Exact selected Explorer row was not found for ${filePath}`);
  return position;
}

export async function closeActiveDesignerTab(designerViewType: string, deadline: number): Promise<void> {
  const tabs = getWebviewTabs(designerViewType);
  assert.strictEqual(tabs.length, 1, 'Exactly one designer tab must be open before closing it');
  assert.strictEqual(tabs[0].isActive, true, 'The designer tab must be active before closing it');
  assert.strictEqual(await vscode.window.tabGroups.close(tabs[0]), true, 'The exact active designer tab must close');
  await poll(
    async () => getWebviewTabs(designerViewType).length,
    (count) => count === 0,
    deadline
  );
}

export async function openExplorerFileByDoubleClick(cdp: CdpEvaluator, filePath: string, deadline: number): Promise<string> {
  const position = await selectedExplorerFilePoint(cdp, filePath, deadline);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...position, button: 'none' });
  for (const clickCount of [1, 2]) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...position,
      button: 'left',
      buttons: 1,
      clickCount,
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      ...position,
      button: 'left',
      buttons: 0,
      clickCount,
    });
  }
  const editor = await poll(
    async () => {
      const active = vscode.window.activeTextEditor;
      return active && isExactPath(active.document.uri.fsPath, filePath) && textEditorTabForPath(filePath)?.isActive ? active : undefined;
    },
    (value) => value !== undefined,
    deadline
  );
  assert.ok(editor);
  return editor.document.getText();
}

export async function replaceActiveNativeEditorText(
  cdp: CdpEvaluator,
  filePath: string,
  replacement: string,
  deadline: number
): Promise<void> {
  assertActiveTextEditor(filePath);
  const position = await poll(
    () =>
      cdp.evaluate<Point | null>(
        undefined,
        `(() => { ${visibleWorkbenchElement}
          const editors = Array.from(document.querySelectorAll('.editor-group-container.active .monaco-editor')).filter(visible);
          const target = editors.length === 1 ? editors[0].querySelector('.view-lines') || editors[0] : null;
          return target ? point(target) : null;
        })()`
      ),
    (value) => value !== null,
    deadline
  );
  assert.ok(position, 'Active native Monaco editor was not visible');
  await clickPoint(cdp, position);
  await pressKey(cdp, 'KeyA', 'a', 65, 2);
  await cdp.send('Input.insertText', { text: replacement });
  await poll(
    async () => {
      const editor = assertActiveTextEditor(filePath);
      return editor.document.isDirty && editor.document.getText() === replacement;
    },
    Boolean,
    deadline
  );
}

export async function saveAndCloseActiveNativeEditor(
  cdp: CdpEvaluator,
  filePath: string,
  expected: unknown,
  deadline: number
): Promise<void> {
  assertActiveTextEditor(filePath);
  await pressKey(cdp, 'KeyS', 's', 83, 2);
  await poll(
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
    deadline
  );
  await pressKey(cdp, 'KeyW', 'w', 87, 2);
  await poll(
    async () => {
      const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      return !isExactPath(activePath, filePath) && !textEditorTabForPath(filePath);
    },
    Boolean,
    deadline
  );
}

export async function openDesignerFromExactExplorerFile(
  cdp: CdpEvaluator,
  filePath: string,
  workflowName: string,
  designerViewType: string,
  deadline: number,
  beforePoll?: () => void | Promise<void>
): Promise<vscode.Tab> {
  assert.strictEqual(getWebviewTabs(designerViewType).length, 0, 'Stale designer tab exists before native reopen');
  const position = await selectedExplorerFilePoint(cdp, filePath, deadline);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', {
      type,
      ...position,
      button: 'right',
      buttons: type === 'mousePressed' ? 2 : 0,
      clickCount: 1,
    });
  }
  await clickText(cdp, '.monaco-menu .action-label', 'Open Designer', deadline);
  const tab = await poll(
    async () => {
      await beforePoll?.();
      const tabs = getWebviewTabs(designerViewType);
      return tabs.length === 1 && tabs[0].isActive && tabs[0].label.includes(workflowName) ? tabs[0] : undefined;
    },
    (value) => value !== undefined,
    deadline
  );
  assert.ok(tab);
  return tab;
}
