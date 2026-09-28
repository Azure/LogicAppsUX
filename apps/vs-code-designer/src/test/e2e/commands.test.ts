import * as assert from 'assert';
import * as vscode from 'vscode';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { waitForVisibleDelay } from './visibleDelay';

const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const expectedCommands = [
  'azureLogicAppsStandard.openDesigner',
  'azureLogicAppsStandard.createWorkspace',
  'azureLogicAppsStandard.createProject',
  'azureLogicAppsStandard.createWorkflow',
  'azureLogicAppsStandard.openOverview',
  'azureLogicAppsStandard.addCustomCode',
  'azureLogicAppsStandard.dataMap.createDataMap',
  'azureLogicAppsStandard.runProjectConsistencyCheck',
  'azureLogicAppsStandard.reportIssue',
];

installDialogGuard();

suite('Logic Apps Commands Tests', () => {
  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension(logicAppsExtensionId);
    assert.ok(extension, `Expected ${logicAppsExtensionId} to be loaded from the extension development path`);
    await extension.activate();
  });

  suiteTeardown(async () => {
    await waitForVisibleDelay('command registration smoke');
  });

  test('Should register expected Logic Apps commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    const missingCommands = expectedCommands.filter((command) => !commands.includes(command));

    assert.deepStrictEqual(missingCommands, [], `Missing expected Logic Apps commands: ${missingCommands.join(', ')}`);
  });

  test('Should expose a focused command namespace', async () => {
    const commands = await vscode.commands.getCommands(true);
    const logicAppsCommands = commands.filter((command) => command.startsWith('azureLogicAppsStandard.'));

    assert.ok(logicAppsCommands.length >= expectedCommands.length, 'Should register the Logic Apps command namespace');
  });

  test('Should be able to access configuration', () => {
    const config = vscode.workspace.getConfiguration('azureLogicAppsStandard');
    assert.ok(config, 'Configuration should be accessible');

    assert.strictEqual(config.get('autoRuntimeDependenciesValidationAndInstallation'), false);
    assert.strictEqual(config.get('autoStartDesignTime'), false);
  });

  test('Should not attempt startup dialogs while registering commands', async () => {
    await assertNoDialogAttempts('Logic Apps command registration smoke');
  });
});
