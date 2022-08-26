import { registerCommands } from './commands/commands';
import type { ExtensionContext } from 'vscode';
import { commands } from 'vscode';

export function activate(context: ExtensionContext) {
  // Set supported file extensions for context menu detection
  const supportedDataMapFileExts = ['.xslt', '.yml']; // TODO: Probably remove .xslt, I don't believe Data Mapper is expected to read that in (yet at least)
  commands.executeCommand('setContext', 'dataMapperExtension.supportedDataMapFileExts', supportedDataMapFileExts);

  const supportedSchemaFileExts = ['.xsd', '.json']; // JSON for TESTING expected returned values/schema-json from backend
  commands.executeCommand('setContext', 'dataMapperExtension.supportedSchemaFileExts', supportedSchemaFileExts);

  commands.executeCommand('setContext', 'dataMapperExtension.supportedFileExts', [...supportedDataMapFileExts, ...supportedSchemaFileExts]);

  registerCommands(context);
}
