import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { applyEdits, modify } from 'jsonc-parser';
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

const textHash = (value: string): string => createHash('sha256').update(value).digest('hex');

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

const visibleTextEditorForPath = (filePath: string): vscode.TextEditor | undefined =>
  vscode.window.visibleTextEditors.find((editor) => isExactPath(editor.document.uri.fsPath, filePath));

const assertVisibleTextEditor = (filePath: string): vscode.TextEditor => {
  const editor = visibleTextEditorForPath(filePath);
  assert.ok(editor, `Visible text editor is not ${filePath}`);
  assert.ok(textEditorTabForPath(filePath)?.isActive, `Exact workflow text tab is not active: ${filePath}`);
  return editor;
};

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

const jsonValueAtPath = (value: unknown, jsonPath: readonly (string | number)[]): unknown =>
  jsonPath.reduce<unknown>((current, segment) => {
    if (typeof segment === 'number') {
      return Array.isArray(current) ? current[segment] : undefined;
    }
    return current !== null && typeof current === 'object' ? (current as Record<string, unknown>)[segment] : undefined;
  }, value);

const focusActiveNativeEditorInput = async (
  connection: Pick<CdpConnection, 'evaluate' | 'send'>,
  filePath: string,
  deadline: number
): Promise<vscode.TextEditor> => {
  const editor = assertActiveTextEditor(filePath);
  await runNativeStep(
    () => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'),
    deadline,
    10_000,
    'focusing the active native workflow.json editor group'
  );
  const editorDeadline = nativeStepDeadline(deadline, 15_000, 'focusing the native workflow.json Monaco input');
  const editorCdp = boundedCdp(connection, editorDeadline);
  type FocusObservation = {
    focused: boolean;
    active: { tagName: string; className: string; role: string | null } | null;
    candidates: Array<{
      tagName: string;
      className: string;
      role: string | null;
      contentEditable: string | null;
      readOnly: boolean;
      disabled: boolean;
      tabIndex: number;
    }>;
  };
  let lastFocusObservation: FocusObservation | undefined;
  try {
    await pollNativeStep(
      async () => {
        lastFocusObservation = await editorCdp.evaluate<FocusObservation>(
          undefined,
          `(() => { ${visibleWorkbenchElement}
            const describe = element => element ? ({
              tagName: element.tagName,
              className: String(element.className || ''),
              role: element.getAttribute('role'),
              contentEditable: element.getAttribute('contenteditable'),
              readOnly: !!element.readOnly,
              disabled: !!element.disabled,
              tabIndex: element.tabIndex,
            }) : null;
            const editors = Array.from(document.querySelectorAll('.editor-group-container.active .monaco-editor')).filter(visible);
            const candidates = editors.length === 1
              ? Array.from(editors[0].querySelectorAll(
                  'textarea, [contenteditable="true"], .native-edit-context, [role="textbox"]'
                ))
              : [];
            const input = candidates.find(candidate => !candidate.disabled && !candidate.readOnly) || null;
            input?.focus();
            return {
              focused: !!input && document.activeElement === input,
              active: describe(document.activeElement),
              candidates: candidates.map(describe),
            };
          })()`
        );
        return lastFocusObservation;
      },
      (value) => value.focused,
      editorDeadline,
      `focusing the native Monaco input for ${filePath}`
    );
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}; focusObservation=${JSON.stringify(lastFocusObservation)}`);
  }
  return editor;
};

const pasteIntoActiveNativeEditorSelection = async (
  connection: Pick<CdpConnection, 'evaluate' | 'send'>,
  text: string,
  deadline: number
): Promise<void> => {
  const pasteDeadline = nativeStepDeadline(deadline, 10_000, 'pasting into the active native workflow.json editor selection');
  const previousClipboard = await runNativeStep(
    () => vscode.env.clipboard.readText(),
    pasteDeadline,
    5_000,
    'reading the clipboard before native workflow.json insertion'
  );
  try {
    await runNativeStep(
      () => vscode.env.clipboard.writeText(text),
      pasteDeadline,
      5_000,
      'copying the native workflow.json insertion text'
    );
    await pressKey(boundedCdp(connection, pasteDeadline), 'KeyV', 'v', 86, 2);
  } finally {
    await vscode.env.clipboard.writeText(previousClipboard);
  }
};

export async function pasteJsonValueIntoActiveNativeEditor(
  connection: Pick<CdpConnection, 'evaluate' | 'send'>,
  filePath: string,
  jsonPath: readonly (string | number)[],
  value: unknown,
  deadline: number
): Promise<string> {
  assert.ok(jsonPath.length > 0, 'Native JSON insertion path is required');
  const editor = await focusActiveNativeEditorInput(connection, filePath, deadline);
  const originalText = editor.document.getText();
  JSON.parse(originalText);
  const tabSize = typeof editor.options.tabSize === 'number' ? editor.options.tabSize : 2;
  const insertSpaces = typeof editor.options.insertSpaces === 'boolean' ? editor.options.insertSpaces : true;
  const eol = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  const edits = modify(originalText, [...jsonPath], value, {
    formattingOptions: { tabSize, insertSpaces, eol },
  });
  assert.strictEqual(edits.length, 1, `Expected one native JSON edit for ${jsonPath.join('.')}`);
  const [edit] = edits;
  assert.ok(edit.offset >= 0 && edit.length >= 0, `Invalid native JSON edit for ${jsonPath.join('.')}`);
  const expectedText = applyEdits(originalText, edits);
  const expectedJson = JSON.parse(expectedText);
  assert.deepStrictEqual(jsonValueAtPath(expectedJson, jsonPath), value, `Native JSON edit did not set ${jsonPath.join('.')}`);

  const start = editor.document.positionAt(edit.offset);
  const end = editor.document.positionAt(edit.offset + edit.length);
  editor.selection = new vscode.Selection(start, end);
  editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  const selectionDeadline = nativeStepDeadline(deadline, 10_000, 'observing the targeted native workflow.json selection');
  await pollNativeStep(
    async () => {
      if (editor.selections.length !== 1) {
        return false;
      }
      const selection = editor.selections[0];
      const anchor = editor.document.offsetAt(selection.anchor);
      const active = editor.document.offsetAt(selection.active);
      return Math.min(anchor, active) === edit.offset && Math.max(anchor, active) === edit.offset + edit.length;
    },
    Boolean,
    selectionDeadline,
    `selecting the native JSON edit for ${jsonPath.join('.')} in ${filePath}`
  );
  await pasteIntoActiveNativeEditorSelection(connection, edit.content, deadline);
  const insertionDeadline = nativeStepDeadline(deadline, 15_000, 'observing the targeted native workflow.json insertion');
  try {
    await pollNativeStep(
      async () => {
        return textEditorTabForPath(filePath)?.isActive === true && editor.document.isDirty && editor.document.getText() === expectedText;
      },
      Boolean,
      insertionDeadline,
      `inserting ${jsonPath.join('.')} into the native editor for ${filePath}`
    );
  } catch (error) {
    const actual = editor.document.getText();
    throw new Error(
      [
        error instanceof Error ? error.message : String(error),
        `dirty=${editor.document.isDirty}`,
        `version=${editor.document.version}`,
        `actualLength=${actual.length}`,
        `expectedLength=${expectedText.length}`,
        `actualHash=${textHash(actual)}`,
        `expectedHash=${textHash(expectedText)}`,
      ].join('; ')
    );
  }
  return expectedText;
}

export async function saveAndCloseActiveNativeEditor(
  connection: Pick<CdpConnection, 'evaluate' | 'send'>,
  filePath: string,
  expected: unknown,
  deadline: number
): Promise<void> {
  let editor = assertVisibleTextEditor(filePath);
  editor = await runNativeStep(
    () => vscode.window.showTextDocument(editor.document, { preview: false, preserveFocus: false }),
    deadline,
    10_000,
    'refocusing the exact native workflow.json editor before save'
  );
  assert.ok(isExactPath(editor.document.uri.fsPath, filePath), `Refocused text editor is not ${filePath}`);
  const saveDeadline = nativeStepDeadline(deadline, 10_000, 'saving the active native workflow.json editor');
  await pressKey(boundedCdp(connection, saveDeadline), 'KeyS', 's', 83, 2);
  const persistenceDeadline = nativeStepDeadline(deadline, 20_000, 'observing the persisted native workflow.json contents');
  await pollNativeStep(
    async () => {
      if (editor.document.isDirty) {
        return false;
      }
      try {
        return isDeepStrictEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')), expected);
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
