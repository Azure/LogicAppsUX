import { registerCommands } from './app/commands/registerCommands';
import type { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext) {
  registerCommands(context);
}
