import { registerCommands } from './app/commands/registerCommands';
import { ext } from './extensionVariables';
import { createAzExtOutputChannel, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import type { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext) {
  ext.context = context;

  ext.outputChannel = createAzExtOutputChannel('Azure Logic Apps (Standard)', ext.prefix);
  context.subscriptions.push(ext.outputChannel);
  registerUIExtensionVariables(ext);

  registerCommands();
}
