import DataMapperExt from './DataMapperExt';
import { startBackendRuntime, stopBackendRuntime } from './FxWorkflowRuntime';
import { registerCommands } from './commands/commands';
import { outputChannelTitle, supportedDataMapFileExts, supportedSchemaFileExts } from './extensionConfig';
import type { ExtensionContext } from 'vscode';
import { window, commands } from 'vscode';

export function activate(context: ExtensionContext) {
  // Set supported file extensions for context menu detection
  commands.executeCommand('setContext', 'azureDataMapper.supportedDataMapFileExts', supportedDataMapFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedSchemaFileExts', supportedSchemaFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedFileExts', [...supportedDataMapFileExts, ...supportedSchemaFileExts]);

  DataMapperExt.outputChannel = window.createOutputChannel(outputChannelTitle);

  registerCommands(context);

  DataMapperExt.log('Data Mapper is loaded and commands are registered');

  startBackendRuntime(DataMapperExt.getWorkspaceFolder());
}

export function deactivate() {
  stopBackendRuntime();
}
