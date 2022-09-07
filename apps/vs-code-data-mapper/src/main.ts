import DataMapperPanel from './DataMapperPanel';
import { registerCommands } from './commands/commands';
import { outputChannelTitle, supportedDataMapFileExts, supportedSchemaFileExts } from './extensionConfig';
import type { ExtensionContext } from 'vscode';
import { window, commands } from 'vscode';

export function activate(context: ExtensionContext) {
  // Set supported file extensions for context menu detection
  commands.executeCommand('setContext', 'azureDataMapper.supportedDataMapFileExts', supportedDataMapFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedSchemaFileExts', supportedSchemaFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedFileExts', [...supportedDataMapFileExts, ...supportedSchemaFileExts]);

  DataMapperPanel.outputChannel = window.createOutputChannel(outputChannelTitle);

  registerCommands(context);

  DataMapperPanel.log('Data Mapper is loaded and commands are registered');
}
