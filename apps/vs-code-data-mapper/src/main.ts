import { registerCommands } from './commands/commands';
import type { ExtensionContext } from 'vscode';
import { commands } from 'vscode';

export function activate(context: ExtensionContext) {
  // Set supported file extensions for context menu detection
  const supportedDataMapFileExts = ['.yml'];
  commands.executeCommand('setContext', 'azureDataMapper.supportedDataMapFileExts', supportedDataMapFileExts);

  const supportedSchemaFileExts = ['.xsd', '.json']; // JSON for TESTING expected returned values/schema-json from backend
  commands.executeCommand('setContext', 'azureDataMapper.supportedSchemaFileExts', supportedSchemaFileExts);

  commands.executeCommand('setContext', 'azureDataMapper.supportedFileExts', [...supportedDataMapFileExts, ...supportedSchemaFileExts]);

  registerCommands(context);

  commands.executeCommand('azureDataMapper.openDataMapper');
}
