import { registerCommands } from './commands/commands';
import type { ExtensionContext } from 'vscode';
import { commands } from 'vscode';

export function activate(context: ExtensionContext) {
  // Set supported file extensions for context menu detection
  const supportedDataMapFileExts = ['.yml'];
  context.globalState.update('azureDataMapper.supportedDataMapFileExts', supportedDataMapFileExts);

  const supportedSchemaFileExts = ['.xsd', '.json']; // JSON for TESTING expected returned values/schema-json from backend
  context.globalState.update('azureDataMapper.supportedSchemaFileExts', supportedSchemaFileExts);

  context.globalState.update('azureDataMapper.supportedFileExts', [...supportedDataMapFileExts, ...supportedSchemaFileExts]);

  registerCommands(context);

  commands.executeCommand('azureDataMapper.openDataMapper');
}
