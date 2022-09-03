import { registerCommands } from './commands/commands';
import { supportedDataMapFileExts, supportedSchemaFileExts } from './extensionConfig';
import type { ExtensionContext } from 'vscode';
import { commands } from 'vscode';

export function activate(context: ExtensionContext) {
  // Set supported file extensions for context menu detection
  commands.executeCommand('setContext', 'azureDataMapper.supportedDataMapFileExts', supportedDataMapFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedSchemaFileExts', supportedSchemaFileExts);
  commands.executeCommand('setContext', 'azureDataMapper.supportedFileExts', [...supportedDataMapFileExts, ...supportedSchemaFileExts]);

  registerCommands(context);
}
