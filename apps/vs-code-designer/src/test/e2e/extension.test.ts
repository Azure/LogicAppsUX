import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { captureCliScreenshot } from './screenshot';
import { normalizeFsPath } from './testUtils';

const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const activationChannelName = 'Logic Apps @vscode/test-cli Smoke';
const expectedExtensionDevelopmentPath = path.resolve(__dirname, '..', '..', '..', 'dist');

installDialogGuard();

suite('Extension Activation Tests', () => {
  let extension: vscode.Extension<unknown> | undefined;
  let activationChannel: vscode.OutputChannel | undefined;

  suiteSetup(() => {
    extension = vscode.extensions.getExtension(logicAppsExtensionId);
    activationChannel = vscode.window.createOutputChannel(activationChannelName);
  });

  test('VS Code is running', () => {
    assert.ok(vscode.version, 'VS Code version should be defined');
    console.log(`[activation-smoke] VS Code version: ${vscode.version}`);
  });

  test('Test runner environment is configured', () => {
    assert.strictEqual(process.env.VSCODE_RUNNING_TESTS, '1');
    assert.strictEqual(process.env.DEBUGTELEMETRY, '1');
  });

  test('Logic Apps extension is present with package metadata', () => {
    assert.ok(extension, `Expected ${logicAppsExtensionId} to be loaded from the extension development path`);
    assert.strictEqual(extension.packageJSON.name, 'vscode-azurelogicapps');
    assert.strictEqual(extension.packageJSON.publisher, 'ms-azuretools');
    assert.strictEqual(extension.packageJSON.engines.vscode, '^1.104.0');
  });

  test('Logic Apps extension is loaded from the development dist folder', () => {
    assert.ok(extension, `Expected ${logicAppsExtensionId} to be loaded from the extension development path`);

    assert.strictEqual(
      normalizeFsPath(extension.extensionUri.fsPath),
      normalizeFsPath(expectedExtensionDevelopmentPath),
      `Expected ${logicAppsExtensionId} to load from ${expectedExtensionDevelopmentPath}`
    );
    assert.strictEqual(extension.packageJSON.main, 'main.js');
    logActivationEvidence(`Loaded ${logicAppsExtensionId} from ${extension.extensionUri.fsPath}`);
  });

  test('Logic Apps extension dependencies are installed and visible to VS Code', () => {
    assert.ok(extension, `Expected ${logicAppsExtensionId} to be loaded from the extension development path`);

    const extensionDependencies = getExtensionDependencies(extension);
    assert.ok(extensionDependencies.length, `${logicAppsExtensionId} should declare extensionDependencies`);

    const missingDependencies = extensionDependencies.filter((extensionId) => !vscode.extensions.getExtension(extensionId));
    assert.deepStrictEqual(missingDependencies, [], `Missing extension dependencies: ${missingDependencies.join(', ')}`);

    for (const extensionId of extensionDependencies) {
      const dependency = vscode.extensions.getExtension(extensionId);
      assert.ok(dependency, `Expected dependency ${extensionId} to be installed`);
      logActivationEvidence(
        `Dependency available: ${extensionId}@${dependency.packageJSON.version ?? 'unknown'} from ${dependency.extensionUri.fsPath}`
      );
    }
  });

  test('Logic Apps extension activates successfully', async () => {
    assert.ok(extension, `Expected ${logicAppsExtensionId} to be loaded from the extension development path`);

    logActivationEvidence(`Activating ${logicAppsExtensionId}`);
    logActivationEvidence(`Extension path: ${extension.extensionUri.fsPath}`);
    logActivationEvidence(`VS Code version: ${vscode.version}`);

    const activationStartedAt = Date.now();
    await extension.activate();
    const activationDurationMs = Date.now() - activationStartedAt;

    assert.strictEqual(extension.isActive, true, 'Extension should be active after activate() resolves');

    logActivationEvidence(`Activated ${logicAppsExtensionId} in ${activationDurationMs}ms`);
  });

  test('Logic Apps extension activation does not attempt startup dialogs', async () => {
    await assertNoDialogAttempts('Logic Apps extension activation');
  });

  test('VS Code starts without a folder or saved workspace loaded', async () => {
    assert.ok(
      !vscode.workspace.workspaceFile || vscode.workspace.workspaceFile.scheme === 'untitled',
      `No saved .code-workspace file should be loaded at startup. Actual: ${vscode.workspace.workspaceFile?.toString()}`
    );
    assert.deepStrictEqual(vscode.workspace.workspaceFolders ?? [], [], 'No folders should be loaded at startup');
    await captureCliScreenshot('empty-window-startup');
  });

  function logActivationEvidence(message: string): void {
    const line = `[activation-smoke] ${message}`;
    console.log(line);
    activationChannel?.appendLine(line);
    activationChannel?.show(true);
  }

  function getExtensionDependencies(logicAppsExtension: vscode.Extension<unknown>): string[] {
    const extensionDependencies = logicAppsExtension.packageJSON.extensionDependencies;

    assert.ok(Array.isArray(extensionDependencies), `${logicAppsExtensionId} should declare extensionDependencies`);
    return extensionDependencies;
  }
});
