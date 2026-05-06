import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Logic Apps Commands Tests', () => {
  vscode.window.showInformationMessage('Starting Command Tests');

  test('Should list all registered commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.length > 0, 'Should have registered commands');
    console.log(`Total commands registered: ${commands.length}`);

    // Filter Logic Apps related commands
    const logicAppsCommands = commands.filter(
      (cmd) => cmd.includes('logicApps') || cmd.includes('azureLogicApps') || cmd.includes('logic-apps')
    );

    console.log(`Logic Apps commands found: ${logicAppsCommands.length}`);
    if (logicAppsCommands.length > 0) {
      console.log('Logic Apps commands:', logicAppsCommands.slice(0, 10));
    }
  });

  test('Should be able to execute showInformationMessage', async () => {
    // This is a basic VS Code API test to ensure the API is working
    const result = vscode.window.showInformationMessage('Test message from e2e test');
    assert.ok(result !== undefined, 'showInformationMessage should return a thenable');
  });

  test('Should be able to create output channel', () => {
    const outputChannel = vscode.window.createOutputChannel('Logic Apps E2E Test');
    assert.ok(outputChannel, 'Should be able to create output channel');

    outputChannel.appendLine('E2E Test Output Channel Created');
    outputChannel.show(true);

    // Clean up
    outputChannel.dispose();
  });

  test('Should be able to access configuration', () => {
    const config = vscode.workspace.getConfiguration('azureLogicAppsStandard');
    assert.ok(config, 'Configuration should be accessible');

    // Try to get a configuration value (might be undefined if not set)
    const projectRuntime = config.get('projectRuntime');
    console.log(`Project runtime config: ${projectRuntime ?? 'not set'}`);
  });
});
