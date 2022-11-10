import DataMapperExt from './DataMapperExt';
import { stopBackendRuntime } from './FxWorkflowRuntime';
import { registerCommands } from './commands/commands';
import { outputChannelPrefix, outputChannelTitle, supportedDataMapDefinitionFileExts, supportedSchemaFileExts } from './extensionConfig';
import { createAzExtOutputChannel, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import type { ExtensionContext } from 'vscode';
import { commands } from 'vscode';

export function activate(context: ExtensionContext) {
  // Set supported file extensions for context menu detection
  commands.executeCommand('setContext', 'azureDataMapper.supportedDataMapDefinitionFileExts', supportedDataMapDefinitionFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedSchemaFileExts', supportedSchemaFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedFileExts', [
    ...supportedDataMapDefinitionFileExts,
    ...supportedSchemaFileExts,
  ]);

  DataMapperExt.context = context;
  DataMapperExt.outputChannel = createAzExtOutputChannel(outputChannelTitle, outputChannelPrefix);
  registerUIExtensionVariables(DataMapperExt);

  // This is where we would: validateFuncCoreToolsIsLatest();

  // This is where we could registerEvent on vscode.workspace.onDidChangeWorkspaceFolders to verifyVSCodeConfigOnActivate

  registerCommands();

  DataMapperExt.log('Data Mapper extension is loaded');
}

export function deactivate() {
  stopBackendRuntime();
}
