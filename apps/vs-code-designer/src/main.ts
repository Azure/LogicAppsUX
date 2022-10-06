import { registerCommands } from './app/commands/registerCommands';
import { ext } from './extensionVariables';
import type { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext) {
  ext.context = context;

  registerCommands();
}
