import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { connectToVsCodeWorkbenchCdp } from './cdpClient';
import { captureEvidenceScreenshot, installFailureScreenshotHook } from './screenshot';
import { closeAllTabs } from './webviewTabs';
import { openExactExplorerFileInNativeEditor } from './workbenchEditorActions';

installFailureScreenshotHook();

const normalizedPhysicalPath = (value: string): string => {
  const resolved = fs.realpathSync.native(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

const isExactPhysicalPath = (actual: string | undefined, expected: string): boolean =>
  typeof actual === 'string' && normalizedPhysicalPath(actual) === normalizedPhysicalPath(expected);

suite('Native Explorer editor click', () => {
  test('one exact Explorer row click opens workflow.json in the native editor', async function () {
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

    const cdp = await connectToVsCodeWorkbenchCdp({ activate: false, timeoutMs: 15_000 });
    try {
      const expected = fs.readFileSync(filePath, 'utf8');
      assert.strictEqual(
        await openExactExplorerFileInNativeEditor(cdp, filePath, Date.now() + 30_000),
        expected,
        'One exact Explorer row click must open the expected workflow.json contents'
      );
      assert.ok(isExactPhysicalPath(vscode.window.activeTextEditor?.document.uri.fsPath, filePath));
      assert.ok(
        vscode.window.tabGroups.all
          .flatMap((group) => group.tabs)
          .some((tab) => tab.isActive && tab.input instanceof vscode.TabInputText && isExactPhysicalPath(tab.input.uri.fsPath, filePath)),
        'The exact workflow.json TabInputText must be active'
      );
      await captureEvidenceScreenshot(
        'native-editor-single-click-open',
        { kind: 'workbenchShell', label: 'nativeEditorClick' },
        {
          deadlineMs: Date.now() + 15_000,
          binding: { activeTabText: ['workflow.json'] },
        }
      );
    } finally {
      cdp.dispose();
      await closeAllTabs();
    }
  });
});
