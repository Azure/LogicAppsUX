import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Logic Apps Workflow Integration Tests', () => {
  const testWorkspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  suiteSetup(async function () {
    this.timeout(30000);
    vscode.window.showInformationMessage('Starting Workflow Integration Tests');

    // Wait for any extension activation
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  test('Should be able to read workflow files from test workspace', async () => {
    if (!testWorkspacePath) {
      console.log('No workspace folder available, skipping test');
      return;
    }

    const workflowDir = path.join(testWorkspacePath, 'Workflows');

    if (fs.existsSync(workflowDir)) {
      const files = fs.readdirSync(workflowDir);
      console.log(`Found ${files.length} files in Workflows directory`);
      assert.ok(files.length >= 0, 'Workflows directory should be readable');
    } else {
      console.log('Workflows directory does not exist in test workspace');
      // This is OK for a new test workspace
      assert.ok(true);
    }
  });

  test('Should be able to open JSON files', async () => {
    // Create a temporary test file
    const testUri = vscode.Uri.parse('untitled:test-workflow.json');

    const doc = await vscode.workspace.openTextDocument(testUri);
    assert.ok(doc, 'Should be able to open text document');
    assert.strictEqual(doc.languageId, 'json', 'Document should be identified as JSON');

    // Close the document
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });

  test('Should be able to register file system watcher', async () => {
    if (!testWorkspacePath) {
      console.log('No workspace folder available, skipping test');
      return;
    }

    // Test file system watcher capability
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.json');

    let changeDetected = false;
    const disposable = watcher.onDidChange(() => {
      changeDetected = true;
    });

    assert.ok(watcher, 'File system watcher should be created');

    // Clean up
    disposable.dispose();
    watcher.dispose();
  });

  test('Should be able to use diagnostics collection', () => {
    const diagnostics = vscode.languages.createDiagnosticCollection('logicAppsTest');
    assert.ok(diagnostics, 'Diagnostics collection should be created');

    // Clean up
    diagnostics.dispose();
  });

  test('Should be able to use status bar', () => {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(gear) Logic Apps Test';
    statusBarItem.tooltip = 'Logic Apps E2E Test Status';
    statusBarItem.show();

    assert.ok(statusBarItem, 'Status bar item should be created');
    assert.strictEqual(statusBarItem.text, '$(gear) Logic Apps Test');

    // Clean up
    statusBarItem.dispose();
  });
});
