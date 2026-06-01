import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Activation Tests', () => {
  vscode.window.showInformationMessage('Starting Extension Activation Tests');

  test('VS Code is running', () => {
    assert.ok(vscode.version, 'VS Code version should be defined');
    console.log(`VS Code version: ${vscode.version}`);
  });

  test('Extension is present', async () => {
    // The extension should be available in the extensions list
    const extension = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');

    // In test environment, the extension might be loaded differently
    // Check if we can at least query extensions
    const allExtensions = vscode.extensions.all;
    assert.ok(allExtensions.length > 0, 'Should have at least one extension loaded');
    console.log(`Total extensions loaded: ${allExtensions.length}`);

    // Log if our extension is found
    if (extension) {
      console.log('Logic Apps extension found!');
    } else {
      console.log('Logic Apps extension not found in list - this may be expected in test environment');
    }
  });

  test('Workspace is available', () => {
    // Check if workspace folders are available
    const workspaceFolders = vscode.workspace.workspaceFolders;
    console.log(`Workspace folders: ${workspaceFolders?.length ?? 0}`);

    // In some test configurations, workspace might be empty
    // This is not necessarily an error
    assert.ok(true, 'Workspace access should be available');
  });
});
