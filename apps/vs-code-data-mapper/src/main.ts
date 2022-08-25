import { registerCommands } from './commands/commands';
import type { ExtensionContext } from 'vscode';
import { commands } from 'vscode';

export function activate(context: ExtensionContext) {
  // Set supported file extensions for context menu detection
  commands.executeCommand('setContext', 'dataMapperExtension.supportedFileExts', [
    '.xslt', // Data Maps
    '.xsd', // Schemas
    '.json',
    '.xml',
  ]);

  registerCommands(context);
}
