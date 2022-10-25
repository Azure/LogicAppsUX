import DataMapperExt from './DataMapperExt';
import { stopBackendRuntime } from './FxWorkflowRuntime';
import { registerCommands } from './commands/commands';
import { outputChannelTitle, supportedDataMapDefinitionFileExts, supportedSchemaFileExts } from './extensionConfig';
import type { ExtensionContext } from 'vscode';
import { window, commands } from 'vscode';

export function activate(context: ExtensionContext) {
  // Set supported file extensions for context menu detection
  commands.executeCommand('setContext', 'azureDataMapper.supportedDataMapDefinitionFileExts', supportedDataMapDefinitionFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedSchemaFileExts', supportedSchemaFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedFileExts', [
    ...supportedDataMapDefinitionFileExts,
    ...supportedSchemaFileExts,
  ]);

  DataMapperExt.outputChannel = window.createOutputChannel(outputChannelTitle);

  registerCommands(context);

  DataMapperExt.log('Data Mapper extension is loaded');
}

export function deactivate() {
  stopBackendRuntime();
}
