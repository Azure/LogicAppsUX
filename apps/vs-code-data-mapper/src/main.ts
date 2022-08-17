import { registerCommands } from './commands/commands';
import type { ExtensionContext } from 'vscode';
import { commands, window } from 'vscode';

export function activate(context: ExtensionContext) {
  window.showInformationMessage('Data Mapper extension has loaded!'); // TESTING ITEM

  // Set supported file extensions for context menu detection
  commands.executeCommand('setContext', 'dataMapperExtension.supportedFileExts', [
    '.xslt', // Data Maps
    '.json', // Schemas
    '.xml',
  ]);

  registerCommands(context);
}
