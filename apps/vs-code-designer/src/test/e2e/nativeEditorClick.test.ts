import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { connectToVsCodeWorkbenchCdp } from './cdpClient';
import { installFailureScreenshotHook } from './screenshot';
import { closeAllTabs } from './webviewTabs';
import {
  openExactExplorerFileInNativeEditor,
  pasteJsonValueIntoActiveNativeEditor,
  saveAndCloseActiveNativeEditor,
} from './workbenchEditorActions';

installFailureScreenshotHook();

const normalizedPhysicalPath = (value: string): string => {
  const resolved = fs.realpathSync.native(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

const isExactPhysicalPath = (actual: string | undefined, expected: string): boolean =>
  typeof actual === 'string' && normalizedPhysicalPath(actual) === normalizedPhysicalPath(expected);

suite('Native Explorer editor click', () => {
  test('one exact Explorer row click supports the full native workflow.json edit lifecycle', async function () {
    this.timeout(120_000);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Native editor click fixture workspace is required');
    const filePath = path.join(workspaceFolder.uri.fsPath, 'workflow.json');
    assert.ok(fs.statSync(filePath).isFile(), 'Native editor click fixture file is required');
    assert.ok(
      vscode.workspace.workspaceFolders?.some(
        (folder) => normalizedPhysicalPath(folder.uri.fsPath) === normalizedPhysicalPath(path.dirname(filePath))
      ),
      'Native editor click fixture must be the active workspace folder'
    );

    const originalText = fs.readFileSync(filePath, 'utf8');
    const cdp = await connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs: 15_000 });
    try {
      assert.strictEqual(
        await openExactExplorerFileInNativeEditor(cdp, filePath, Date.now() + 30_000),
        originalText,
        'One exact Explorer row click must open the expected workflow.json contents'
      );
      assert.ok(isExactPhysicalPath(vscode.window.activeTextEditor?.document.uri.fsPath, filePath));
      assert.ok(
        vscode.window.tabGroups.all
          .flatMap((group) => group.tabs)
          .some((tab) => tab.isActive && tab.input instanceof vscode.TabInputText && isExactPhysicalPath(tab.input.uri.fsPath, filePath)),
        'The exact workflow.json TabInputText must be active'
      );
      const composeAction = {
        type: 'Compose',
        inputs: 'test',
        runtimeConfiguration: {
          requestOptions: {
            timeout: 'PT24H',
          },
        },
      };
      const replacement = {
        definition: {
          triggers: {},
          actions: {
            Compose: composeAction,
          },
        },
      };
      const replacementText = await pasteJsonValueIntoActiveNativeEditor(
        cdp,
        filePath,
        ['definition', 'actions', 'Compose'],
        composeAction,
        Date.now() + 60_000
      );
      const replacedDocument = vscode.workspace.textDocuments.find(
        (document) => document.uri.scheme === 'file' && isExactPhysicalPath(document.uri.fsPath, filePath)
      );
      assert.strictEqual(replacedDocument?.getText(), replacementText);
      assert.strictEqual(replacedDocument?.isDirty, true);
      await saveAndCloseActiveNativeEditor(cdp, filePath, replacement, Date.now() + 60_000);
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')), replacement);
    } finally {
      try {
        await closeAllTabs();
      } finally {
        fs.writeFileSync(filePath, originalText, 'utf8');
        cdp.dispose();
      }
    }
  });
});
